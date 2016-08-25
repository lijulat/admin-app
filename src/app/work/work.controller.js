'use strict';

var module = angular.module('supportAdminApp');

module.controller('workController', ['$scope', '$rootScope', '$timeout', '$state', '$uibModal',
    'AuthService', 'WorkService', 'UserService', '$stateParams', 'MembersService',
    function ($scope, $rootScope, $timeout, $state, $modal, $authService, $workService, $userService, $stateParams, $membersService) {

        /**
         * Check if user is logged in
         */
        $scope.authorized = function () {
            return $authService.isLoggedIn();
        };

        /**
         * Object storing state of work search and
         * adding new work operation
         */
        $scope.workSearch = {
            isLoading: false,
            workFound: false,
            addwork: false,
            workSubmitted: false,
            workId: '',
            setLoading: function (loading) {
                this.isLoading = loading;
            }
        };

        /** work object of currently fetched work */
        $scope.workObj = null;
        $scope.isValidwork = false;

        /**
         * This method finds work-objects details by id
         * and the related work items
         */
        $scope.findwork = function () {
            $scope.$broadcast('alert.ClearAll', {});
            $scope.workSearch.isLoading = true;
            $scope.work = {};
            $scope.workSteps = {};
            /** Fetches work Details  */
            $workService.findWorkById($scope.workSearch.workId).then(
                function (responsework) {
                     //Set of work steps
                    $workService.getWorkSteps($scope.workSearch.workId).then(
                        function(steps) {
                            $scope.workSteps = steps;
                        },
                        function(error) {
                            $scope.$broadcast('alert.AlertIssued', {
                                type: 'danger',
                                message: error
                            });
                        }
                    );
                    var query = $membersService.generateSearchQuery([
                        responsework.ownerId, responsework.copilotId
                    ]);

                    // Uses MembersService to find in ElasticSearch the member
                    // objects for the owner and copilot of this work (search
                    // by 'ownerId' and 'copilotId' of the work object), and
                    // attaches the result objects to 'copilot' and 'owner'
                    // fields of the work object.
                    $membersService.search(query).then(
                        function(members) {
                            var map = members.reduce(function(map, member) {
                                map[member.userId] = member;
                                return map;
                            }, {});
                            responsework.copilot = map[responsework.copilotId];
                            responsework.owner = map[responsework.ownerId];
                        },
                        function(error) {
                            $scope.$broadcast('alert.AlertIssued', {
                                type: 'danger',
                                message: error
                            });
                        }
                    );

                    $scope.workSearch.workFound = true;
                    $scope.workObj = responsework;
                    $scope.workSearch.isLoading = false;
                    $scope.workSearch.setLoading(false);
                },
                function (error) {
                    $scope.workSearch.isLoading = false;
                    $scope.workSearch.workFound = false;
                    $scope.workObj = null;
                    $scope.work = null;
                    var errorMessage = error.error;
                    if (error.status == 404) {
                        errorMessage = 'project with id ' + $scope.workSearch.workId +
                        ' not found';
                    }
                    $scope.$broadcast('alert.AlertIssued', {
                        type: 'danger',
                        message: errorMessage
                    });
                }
                );
        };

        angular.element(document).ready(function () {
            if ($stateParams.id) {
                $scope.workSearch.workId = $stateParams.id;
                $scope.findwork();
            }
        });
    }
]);