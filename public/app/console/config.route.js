(function() {
  'use strict';

  angular
    .module('app.console')
    .config(configFunction);

  configFunction.$inject = ['$stateProvider'];

  function configFunction($stateProvider) {
    
    $stateProvider
      .state('console', {
        url: '/console',
        templateUrl: 'app/console/console.html',
        controller: 'consoleController',
        controllerAs: 'vm',
        abstract: true
      })
      .state('console.analytics', {
        url: '',
        templateUrl: 'app/console/analytics/analytics.html',
        controller: 'AnalyticsController',
        controllerAs: 'vm',
        data : { pageTitle: 'Robota'},
      })

      
  }


})();
