(function () {
  'use strict';

  angular
    .module('app', [
      // Angular modules.
      'ui.router',

      // Third party modules.
      'ngMaterial',
      'ngAnimate',

      // Custom modules.
      'app.core',
      'app.layout',
      'app.console'
    ])
    .config(configFunction)
   

  configFunction.$inject = ['$stateProvider', '$urlRouterProvider', '$locationProvider'];
  function configFunction($stateProvider, $urlRouterProvider, $locationProvider) {
    $urlRouterProvider.otherwise('/console');
    $locationProvider.html5Mode(true);
  }

})();
