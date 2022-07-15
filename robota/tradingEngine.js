module.exports.trade = trade

//trading logic here

function trade(candles) {

    latestCandle = candles[candles.length - 1]
    price = latestCandle.close

    const c = 9
    const b = 26
    const B = 52
    const lead = 26
    candlesLength = candles.length

    conversionArray = candles.slice(candlesLength - c - lead, candlesLength - lead)
    baseArray = candles.slice(candlesLength - b - lead, candlesLength - lead)
    leadingbArray = candles.slice(candlesLength - B - lead, candlesLength - lead)

    conversion = (getHigh(conversionArray) + getLow(conversionArray)) / 2
    base = (getHigh(baseArray) + getLow(baseArray)) / 2

    leadingA = (conversion + base) / 2
    leadingB = (getHigh(leadingbArray) + getLow(leadingbArray)) / 2

    macdHist = calculateMACDhist(candles)
    atr = calculateATR(candles, 14)

    return tradingEngine(leadingA, leadingB, macdHist, atr, price)

}

function tradingEngine(leadingA, leadingB, macdHist, atr, price) {
    action = 'Do nothing'

    if (leadingA / price > 1.069 && leadingB > leadingA) {
        //first buying condition
        if (macdHist > -31 && macdHist < 1) {
            action = "BUY"
        }
        else if (price < (entryPrice[i] - (atr * 3.1))) {
            action = "SELL"
        }
    }
    else if (price > leadingA) {
        action = "SELL"
    }
    else {
        action = 'Do nothing'
    }



    result = {
        action: action,
        leadingA: leadingA,
        leadingB: leadingB,
        macdHist: macdHist,
        atr: atr,
    }
    return result
}


//utils

function getHigh(array) {
    high = 0
    for (var i = 0; i < array.length; i++) {
        if (array[i].high > high) {
            high = array[i].high
        }
    }

    return high
}

function getLow(array) {
    low = 10000000000
    for (var i = 0; i < array.length; i++) {
        if (array[i].low < low) {
            low = array[i].low
        }
    }

    return low
}

function calculateMA(array) {
    sum = 0
    for (var i = 0; i < array.length; i++) {
        sum += array[i]
    }

    return sum / array.length
}

function calculateEMA(array, period) {
    ema = 0
    multiplier = 2 / (period + 1)
    tempArray2 = []

    for (var i = 0; i < array.length; i++) {
        if (i < period + 1) {
            tempArray2.push(array[i].close)

            if (tempArray.length == period) {
                ema = calculateMA(tempArray2)
                tempArray2 = []
            }
        }
        else {
            currentClose = array[i].close
            ema = ((currentClose - ema) * multiplier) + ema
        }
    }

    return ema
}

function calculateEMA2(array, period) {
    ema = 0
    multiplier = 2 / (period + 1)
    tempArray = []

    for (var i = 0; i < array.length; i++) {
        if (i < period + 1) {
            tempArray.push(array[i])

            if (tempArray.length == period) {
                ema = calculateMA(tempArray)
                tempArray = []
            }
        }
        else {
            currentClose = array[i]
            ema = ((currentClose - ema) * multiplier) + ema
        }
    }
    return ema
}

function calculateMACDhist(array) {
    macdHist = 0
    signalArray = []
    tempArray = []

    for (var i = 0; i < 100; i++) {
        tempArray = array.slice(100 + i, array.length - 100 + i)
        macdLineTemp = calculateEMA(tempArray, 12) - calculateEMA(tempArray, 26)
        signalArray.push(macdLineTemp)
        tempArray = []
    }

    macdLine = calculateEMA(array, 12) - calculateEMA(array, 26)
    signalArray.push(macdLine)
    signalLine = calculateEMA2(signalArray, 9)
    signalArray = []
    macdHist = macdLine - signalLine

    //console.log( macdHist + "  " + macdLine + "  " + signalLine)

    return macdHist
}

function calculateATR(array, period) {
    priorATR = 0
    currentTR = 0
    currentATR = 0
    tempArray3 = []
    tempArray4 = []

    for (var i = 0; i < array.length; i++) {
        if (i < period) {
            tempArray3.push(array[i])

            if (tempArray3.length == period) {
                candle1 = tempArray3[period - 1]
                currentTR = candle1.high - candle1.low
                for (var j = 0; j < period - 1; j++) {
                    tempCandle = tempArray3[j]
                    firstATR = tempCandle.high - tempCandle.low
                    tempArray4.push(firstATR)
                }
                priorATR = calculateMA(tempArray4)
                tempArray3 = []
                tempArray4 = []

                currentATR = (((priorATR * (period - 1)) + currentTR)) / period

            }
        }
        else {
            candle2 = array[i]
            currentTR = candle2.high - candle2.low
            currentATR = ((currentATR * (period - 1)) + currentTR) / period;
        }

    }

    return currentATR

}