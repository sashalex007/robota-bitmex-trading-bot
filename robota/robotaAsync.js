module.exports.start = start
module.exports.openClientSocket = openClientSocket


const BitmexClient = require('bitmex-realtime-api')
var BitMexApi = require('bit_mex_api');
const async = require('async')
const rr = require('requestretry');

//modules
const tradingEngine = require('./tradingEngine')

//system
robotaStatus = false // is bot running
clientSocket = null // browser websocket
const serverTimeout = 500 //delay between requests
const asyncMaxAttempts = 30 //max number of retry attempts
const asyncRetryDelay = 1000 //delay between retries


retryParams = {
  fullResponse: false,
  maxAttempts: asyncMaxAttempts,
  retryDelay: asyncRetryDelay,
  retryStrategy: retryStrategy
}

//gdax
gdaxSocket = null //gdax websocket 
gdaxResetInterval = null //checks for dead gdax socket
gdaxErrorInterval = null //checks for errors in gdax socket

//candles
candleCount = 0 //number of candles closed by robota 
candleInterval = null //closes candles on set interval 
candleStartTime = 0 //when candle started. Needed for syncing and getting time remaining on candle

//to client websocket
bitmexPrice = 0 // live bitmex price
tradeResult = "" // result from tradingEngine.js

//bitmex position
bitmexCandles = []


//trading variables
const binSize = "5m"
const candleMinute = 5 //candle duration in minutes 
const maPeriod = 50 // moving average period...needed for slicing array to send to client 
const candleDuration = 60000 * candleMinute //candle duration in milliseconds

async function start() {
  await getBitmexCandles()
  openBitmexSocket()
}

async function getBitmexCandles() {

  var apiInstance = new BitMexApi.TradeApi();
  var opts = { 
    'binSize': binSize, // String | Time interval to bucket by. Available options: [1m,5m,1h,1d].
    'partial': true, // Boolean | If true, will send in-progress (incomplete) bins for the current time period.
    'symbol': "XBTUSD", // String | Instrument symbol. Send a bare series (e.g. XBU) to get data for the nearest expiring contract in that series.  You can also send a timeframe, e.g. `XBU:monthly`. Timeframes are `daily`, `weekly`, `monthly`, `quarterly`, and `biquarterly`.
    'count': 750, // Number | Number of results to fetch.
    'start': 0, // Number | Starting point for results.
    'reverse': true, // Boolean | If true, will sort results newest first.
  };

  apiInstance.tradeGetBucketed(opts, function(error, data, respons) {
    if(data) {
         bitmexCandles = sortCandles(data)
     }
    })
    
  function sortCandles(data) {
    array = []
    data.reverse();
    for (var i = 0; i < data.length; i++) {

      let tick = data[i];
      var object = {};

      object.open = tick.open;
      object.high = tick.high;
      object.low = tick.low;
      object.close = tick.close;
      object.time = (new Date(tick.timestamp)).getTime();

      array.push(object)
    }

    console.log(array[array.length-1].close)

    return array
  }
}

function openBitmexSocket() {

  var deadInterval =  setInterval(detectDeadSocket, 30000) //kills dead socket after 30s
  var errorInterval = setInterval(errorCounter, 15000) //kills socket with errors
  var resetCount = 0 //prices streamed inside 30s (gdax reset interval)
  var errorCount = 0 //number of errors thrown by websocket 

  const bitmexClient = new BitmexClient({ testnet: false })
  bitmexClient.addStream('XBTUSD', 'instrument', function (data, symbol, tableName) {
    if (data.length) {
      const quote = data[data.length - 1];
      var time = (new Date(quote.timestamp)).getTime();

      if (robotaStatus == false) { //is robota already running? needed for initation process 
        if (bitmexCandles[bitmexCandles.length - 1].time + candleDuration < time) { //finds missing candle
          console.log('Missing candle....restarting')
          sendClientMessage('Missing candle...restarting')
          clearInterval(deadInterval)
          clearInterval(errorInterval)
          bitmexCandles = [] //deletes candles for next try
          setTimeout(openBitmexSocket, 10000) //restart in 10 seconds 
        }
        else { //if no missing candles, begin initation process
          robotaStatus = true
          bitmexAvailable = true
          console.log('Robota initiated')
          sendClientMessage('Robota initiated')
          startCandleTimer(time) //needed to sync candles with current price 
        }
      }

      bitmexAvailable = true
      resetCount++
      bitmexPrice = quote.lastPrice
      buildCandle(bitmexPrice)

      sendClientUpdate()
    }
  })
  bitmexClient.on('error', () => {
    errorCount++
    bitmexAvailable = false
  })
  bitmexClient.on('close', () => {

  })

  function detectDeadSocket() { //detect dead socket by counting heartbeat instances 
    if (resetCount == 0) {
      console.log('Bitmex socket dead')
    }
    else {
      resetCount = 0
    }
  }

  function errorCounter() {
    if (errorCount > 2) {
      console.log('Socket error')
      
    }
    errorCount = 0
  }

}

//syncs realtime price with candles - first called by openGDAXsocket 
function startCandleTimer(priceTime) {
  trade() //run trading engine on last candles.

  syncDelta = getSyncDelta(priceTime)

  i = bitmexCandles.length - 1 //finds out when to close next candle based on time of realtime price (priceTime)
  currentCandleEnd = bitmexCandles[i].time + (candleDuration - syncDelta)
  candleStartTime = bitmexCandles[i].time
  syncTime = currentCandleEnd - priceTime
  console.log(syncTime / 1000 + " seconds to sync")

  firstCandle = {
    open: bitmexCandles[i].close,
    high: bitmexPrice,
    low: bitmexPrice,
    close: bitmexPrice,
    time: bitmexCandles[i].time + candleDuration
  }
  bitmexCandles.push(firstCandle)
  setTimeout(closeCandle, syncTime) //close the candle after sync time has elapsed 
}

//closes candle on candleInterval - first called by startCandleTimer
function closeCandle() {
  i = bitmexCandles.length - 1
  syncDelta = getSyncDelta(bitmexCandles[i].time)
  console.log("Delay:" + syncDelta + "ms")

  candleInterval = setTimeout(closeCandle, (candleDuration - syncDelta))
  candleCount++

  bitmexCandles[i].close = bitmexPrice

  console.log('---------------')
  trade()

  candleStartTime = (new Date()).getTime() //insert new incomplete candle (build by buildCandle)
  newCandle = {
    open: bitmexPrice,
    high: bitmexPrice,
    low: bitmexPrice,
    close: bitmexPrice,
    time: bitmexCandles[i].time + candleDuration
  }
  //shift array
  bitmexCandles.shift() //remove last in candle array 
  bitmexCandles.push(newCandle)

}

//build candle...gets highs and lows - called on new realtime price 
function buildCandle(price) {
  i = bitmexCandles.length - 1
  //candle build
  if (price > bitmexCandles[i].high) {
    bitmexCandles[i].high = price
  }
  if (price < bitmexCandles[i].low) {
    bitmexCandles[i].low = price
  }
  if (bitmexCandles[i].low == 0) {
    bitmexCandles[i].low = price
  }
}

//delegates trading functions - called when candle is closed (closeCandle)
function trade() {
  candles = bitmexCandles

  function getTradeResult(candles) {
    return new Promise(resolve => {
      resolve(tradingEngine.trade(candles))
    })
  }

  async function delegateResult(candles) {
    result = await getTradeResult(candles)
    return result
  }

  delegateResult(candles)
    .then((result) => {
      if(result.action) {
        tradeResult = result
        //Place open/close position logic here for automated trading
      }
      action = tradeResult.action
      console.log(action)
      sendClientData()
     
    });

}

//opens socket with client - called by server.js
function openClientSocket(ws) {
  if (ws) {

    if (clientSocket) {
      clientSocket.terminate()
      clientSocket = null
    }

    clientSocket = ws //transfer socket to global variable 
    object = createClientObject();
    ws.send(JSON.stringify(object)) //send client data
    sendClientUpdate() //send client latest price 
  }

}

//sends client data created every candle close (candles, tradeResult, position ect..) 
function sendClientData() { //caled by trade(), getPosition() and stop()
  if (clientSocket) {
    if (clientSocket.readyState === clientSocket.OPEN) {
      object = createClientObject()
      clientSocket.send(JSON.stringify(object))
    }
  }
}

//sends client data created for every new price received (status, price, candle) 
function sendClientUpdate() { //called by openGDAXsocket, openClientSocket, stop()
  if (clientSocket) {

    if (clientSocket.readyState === clientSocket.OPEN) {
      candleTimeLeft = 0
      if (candleStartTime != 0) {
        candleTimeLeft = getRemainingTime()
      }

      priceOject = { //sends price and status 
        bitmexRealtime: bitmexPrice,
        robotaStatus: robotaStatus,
        bitmexAvailable: bitmexAvailable,
        candleTimeLeft: candleTimeLeft      }
      clientSocket.send(JSON.stringify(priceOject))
    }

  }
}

//sends client message - called by openGDAXsocket, stop(), retryStrategy
function sendClientMessage(message) {
  if (clientSocket) {
    clientSocket.send(JSON.stringify({ robotaMessage: message }))
  }
}

//creates objects to send to client - called by sendClientData, openClientSocket
function createClientObject() {
  cut = bitmexCandles.length - maPeriod
  splicedArray = bitmexCandles.slice(cut) //limit candles sent to maPeriod
  if (candleCount != 0) { //handling for sync period (startCandleTimer) 
    splicedArray.pop()
  }

  clientObject = {
    trade: tradeResult,
    candleCount: candleCount,
    candles: splicedArray,
    candleDuration: binSize
  }
  return clientObject
}

//gets time left for candle - called only by sendClientUpdate
function getRemainingTime() {
  timeLeft = Math.round((candleDuration - ((new Date()).getTime() - candleStartTime)) / 1000)
  return timeLeft
}

//retry strategy for request library
function retryStrategy(err, response, body) {
  object = JSON.parse(body)
  isError = err || 500 <= response.statusCode && response.statusCode < 600 || object.error
  if (isError) {
    console.log('...')
    sendClientMessage('Error...retrying')
  }
  return isError
}

function getSyncDelta(time) {
  date = new Date();
  currentTime = date.getTime();

  return currentTime - time
}
