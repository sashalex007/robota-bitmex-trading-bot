(function () {
    'use strict';

    angular
        .module('app.console')
        .controller('consoleController', consoleController);


    consoleController.$inject = ['$state'];

    function consoleController($state) {
        var vm = this;
        vm.currentNavItem;
        initialTab();

        function initialTab() {
            var state = $state.current.name;
            tabPicker(state);
        }


        function tabPicker(state) {
            if (state == 'console.analytics') {
                vm.currentNavItem = 'analytics'
            }
            if (state == 'console.account') {
                vm.currentNavItem = 'account'
            }
            if (state == 'console.support') {
                vm.currentNavItem = 'support'
            }
        }

    }

})();
