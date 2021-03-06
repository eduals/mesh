angular.module('meshApp.profile', [
    'ui.router'
])
    .config(function config($stateProvider) {
        $stateProvider.state('home.profile', {
            url: '/profile/:username',
            controller: 'ProfileCtrl',
            templateUrl: 'profile/profile.tpl.html',
            data: {pageTitle: 'Profile | Mesh'}
        });
    })

    .controller('ProfileCtrl', function ProfileController($scope, $stateParams, $http, server, meshApi, $modal, _, ngDialog, toastr) {
        $scope.all = {};
        $scope.user = {};
        $scope.newUser = {};
        $scope.isLoggedIn = meshApi.isLoggedIn();
        $scope.ownUsername = meshApi.getLoggedUsername();

        $scope.getFollowers = function () {
            if (!$scope.user.followers) {
                meshApi.getFollowers($stateParams.username).success(function (data) {
                    $scope.user.followers = data;
                });
            }
        };

        $scope.inviteToGroup = function () {
            var modalInstance = $modal.open({
                templateUrl: 'inviteToGroupId',
                controller: 'InviteToGroupModalCtrl'
            });

            modalInstance.result.then(function (groupName) {
                //console.log("scope.user.username", $scope.user.username);
                meshApi.inviteToGroup(groupName, $stateParams.username)
                    .success(function () {
                        toastr.success('Invite successful', 'Invite to Group');
                    })
                    .error(function () {
                        toastr.error('Invite failed', 'Invite to Group');
                    });
            });
        };

        $scope.getFavorites = function () {
            meshApi.getFavorites($stateParams.username)
                .success(function(data) {
                    $scope.favorites = data;
                });
        };

        $scope.getGroups = function () {
            if (!$scope.user.groups) {
                meshApi.getUserGroups($stateParams.username)
                    .success(function (data) {
                        $scope.user.groups = data;
                    });
            }
        };

        $scope.getFollowing = function () {
            if (!$scope.user.following) {
                meshApi.getFollowing($stateParams.username).success(function (data) {
                    $scope.user.following = data;
                });
            }
        };

        $scope.getAllModels = function () {
            $scope.isAllModelsSelected = true;
            $scope.selectedGallery = null;
            if (!$scope.allModels) {
                meshApi.getAllModels($stateParams.username).success(function (data) {
                    $scope.allModels = data;
                    $scope.models = $scope.allModels;
                });
            }
            else {
                $scope.models = $scope.allModels;
            }
        };

        //$scope.getAllModels();

        $scope.getAllGalleries = function () {

            if (!$scope.galleries) {
                meshApi.getAllGalleries($stateParams.username)
                    .then(function (response) {
                        //console.log("Galleries", response.data);
                        $scope.galleries = response.data;
                    });
                $scope.isAllModelsSelected = true;
                $scope.getAllModels();
            }
        };

        $scope.deleteGallery = function () {
            var galleryToDelete = $scope.selectedGallery;
            meshApi.deleteGallery(galleryToDelete.name)
                .success(function () {
                    ngDialog.openConfirm({
                        template: 'deleteGallerySuccessId',
                        className: 'ngdialog-theme-default'
                    }).then(function () {
                        // do nothing
                    });
                    _.remove($scope.galleries, function (gallery) {
                        return gallery.name == galleryToDelete.name;
                    });
                })
                .error(function () {
                    ngDialog.openConfirm({
                        template: 'deleteGalleryErrorId',
                        className: 'ngdialog-theme-default'
                    }).then(function () {
                        // do nothing
                    });
                });

        };

        $scope.editGallery = function () {
            var modalInstance = $modal.open({
                templateUrl: 'editGalleryId',
                controller: 'EditGalleryModalCtrl',
                resolve: {
                    gallery: function () {
                        return $scope.selectedGallery;
                    }
                }
            });

            modalInstance.result.then(function (galleryInformation) {
                console.log("gallery", galleryInformation);
                meshApi.updateGallery(galleryInformation.name, galleryInformation.isPublic)
                    .success(function (response) {
                        _.forEach($scope.galleries, function (gallery) {
                            if (gallery.name == galleryInformation.name) {
                                gallery.isPublic = galleryInformation.isPublic;
                            }
                        });
                        ngDialog.openConfirm({
                            template: 'editGallerySuccessId',
                            className: 'ngdialog-theme-default'
                        }).then(function () {
                            // do nothing
                        });
                    })
                    .error(function () {
                        ngDialog.openConfirm({
                            template: 'editGalleryErrorId',
                            className: 'ngdialog-theme-default'
                        }).then(function () {
                            // do nothing
                        });
                    });
            });
        };

        $scope.selectedGallery = null;
        $scope.galleriesPaginatorSetPage = function (pageNo) {
            $scope.galleriesPaginatorCurrentPage = pageNo;
        };

        $scope.changeSelectedGallery = function (index) {
            $scope.selectedGallery = $scope.galleries[index];
            $scope.galleriesPaginatorCurrentPage = 1;
        };

        $scope.selectGallery = function (gallery) {
            $scope.isAllModelsSelected = false;
            $scope.selectedGallery = gallery;

            if (!gallery.models) {
                meshApi.getModelsFromGallery($stateParams.username, gallery.name)
                    .success(function (response) {
                        console.log("response", response);
                        gallery.models = response;
                        $scope.models = gallery.models;
                    })
                    .error(function (response) {
                        console.log("response", response);
                    });
            }
            else {
                $scope.models = gallery.models;
            }
        };

        $scope.isGallerySelected = function (gallery) {
            return $scope.selectedGallery === gallery;
        };


        $scope.addNewGallery = function () {
            var modalInstance = $modal.open({
                templateUrl: 'createNewGalleryId',
                controller: 'CreateNewGalleryModalCtrl',
                resolve: {
                    galleries: function () {
                        return $scope.galleries;
                    }
                }
            });

            modalInstance.result.then(function (gallery) {
                console.log("gallery", gallery.name);
                meshApi.createGallery(gallery.name)
                    .success(function (response) {
                        ngDialog.openConfirm({
                            template: 'addGallerySuccessId',
                            className: 'ngdialog-theme-default'
                        }).then(function () {
                            // do nothing
                        });
                        $scope.galleries.push(response);
                    })
                    .error(function () {
                        ngDialog.openConfirm({
                            template: 'addGalleryErrorId',
                            className: 'ngdialog-theme-default'
                        }).then(function () {
                            // do nothing
                        });
                    });
            });
        };

        $scope.submit = function () {
            var fields = {
                firstName: true,
                lastName: true,
                about: true
            };

            var updatedUser = _.omit($scope.user, function (value, key) {
                return !fields[key];
            });

            var interestsText = _.pluck($scope.newUser.interests, 'text');

            updatedUser.interests = interestsText;
            meshApi.updateUser(updatedUser).success(function (data) {
                angular.element('#form-message').remove();
                angular.element('form[name=userInfo]').prepend(
                    '<div id="form-message" class="alert alert-success">' +
                    '<button type="button" class="close" data-dismiss="alert" aria-hidden="true">×</button>' +
                    'Your profile has been updated successfully.' +
                    '</div>');

                $scope.user.interests = data.interests;
                $scope.newUser.interests = data.interests.slice(0);

                $scope.user.about = data.about;
                $scope.user.firstName = data.firstName;
                $scope.user.lastName = data.lastName;
            }).error(function (data) {
                angular.element('#form-message').remove();
                angular.element('form[name=userInfo]').prepend(
                    '<div id="form-message" class="alert alert-danger">' +
                    '<button type="button" class="close" data-dismiss="alert" aria-hidden="true">×</button>' +
                    'Oops, something went wrong. Try again later.' +
                    '</div>');
            });
        };

        $scope.init = function () {
            meshApi.getUser($stateParams.username). // TODO: make url configurable?
                success(function (data) {
                    $scope.user = data;
                    $scope.newUser.interests = data.interests.slice(0); // clone the interests array
                    $scope.getAllGalleries();
                }).
                error(function (err) {
                    console.log("The user could not be retrieved: " + err.message); //TODO redirect to error page
                });
        };
    })
    .controller('CreateNewGalleryModalCtrl', function ($scope, $modalInstance, galleries, _) {

        $scope.galleries = galleries;
        $scope.ok = function () {
            var isPublic = $scope.visibility == 'public';
            $modalInstance.close({name: $scope.galleryName, isPublic: isPublic});
        };

        $scope.cancel = function () {
            $modalInstance.dismiss('cancel');
        };

        $scope.galleryExists = function () {
            return _.some($scope.galleries, function (gallery) {
                return gallery.name == $scope.galleryName;
            });
        };

    })
    .controller('EditGalleryModalCtrl', function ($scope, $modalInstance, gallery) {

        $scope.gallery = gallery;
        console.log("EditModalGallery", gallery);
        $scope.visibility = $scope.gallery.isPublic ? 'public' : 'private';
        $scope.ok = function () {
            var isPublic = $scope.visibility == 'public';
            $modalInstance.close({name: $scope.gallery.name, isPublic: isPublic});
        };

        $scope.cancel = function () {
            $modalInstance.dismiss('cancel');
        };

    })
    .controller('InviteToGroupModalCtrl', function ($scope, $modalInstance, meshApi) {
        meshApi.getUserGroups(meshApi.getLoggedUsername())
            .success(function (data) {
                $scope.groups = data;
            });

        $scope.ok = function () {
            $modalInstance.close($scope.name);
        };

        $scope.cancel = function () {
            $modalInstance.dismiss('cancel');
        };
    });