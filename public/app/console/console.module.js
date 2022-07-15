(function () {
  'use strict';

  angular.module("app.console", ["chart.js", "ngMaterial", "ngMessages", 'material.svgAssetsCache'])

    .config(function ($mdThemingProvider) {
      $mdThemingProvider.theme('default')
        .accentPalette('teal', { 'default': '500' });
    })


    .config(function (ChartJsProvider) {
      // Configure all charts
      ChartJsProvider.setOptions({
        responsive: true,
        legend: {
          display: true,
          position: "top",
          labels: {
            fontSize: 15,
            boxWidth: 20
          }
        },
        hover: {
          mode: "single"
        },
        elements : {
          point: {
            radius: 0
          }
        },
        scales: {
          xAxes: [{
                      gridLines: {
                          color: "rgba(0, 0, 0, 0)",
                      }
                  }],
          yAxes: [{
                      gridLines: {
                          color: "rgba(0, 0, 0, 0)",
                      }   
                  }]
          }




      });
      // Configure all doughnut charts
      ChartJsProvider.setOptions('chart-line', {

        
      });
    });


})();