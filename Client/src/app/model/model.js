angular.module('meshApp.model', [
    'ui.router', 'ui.bootstrap'
])
    .directive('visualizer', function (meshApi, usSpinnerService, $rootScope) {
        return {
            restrict: 'AE',
            scope: {
                modelId: '@modelId',
                filename: '@filename',
                modelLoaded: '=modelLoaded'
            },
            link: function postLink($scope, $element, $attrs) {
                var done = false;

                console.log($attrs.filename);
                var objMatches = $attrs.filename.match(/.*\.obj$/);
                var stlMatches = $attrs.filename.match(/.*\.stl$/);
                console.log(stlMatches);
                $scope.init = function () {
                    $scope.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 10000);

                    $scope.scene = new THREE.Scene();

                    var manager = new THREE.LoadingManager();
                    manager.onProgress = function (item, loaded, total) {

                        console.log(item, loaded, total);

                    };

                    var onProgress = function (xhr) {
                        if (xhr.lengthComputable) {
                            var percentComplete = xhr.loaded / xhr.total * 100;
                            console.log(Math.round(percentComplete, 2) + '% downloaded');
                        }
                    };

                    var onError = function (xhr) {
                        console.log("Error");
                    };

                    var args = {antialias: true, preserveDrawingBuffer: true };

                    $scope.renderer = Detector.webgl ? new THREE.WebGLRenderer(args) : new THREE.CanvasRenderer(args);
                    $scope.renderer.setClearColor(0xf8f8f8 /* light gray */, 1);

                    $scope.size = {
                        width: angular.element('#rendererContainer').innerWidth(),
                        height: angular.element('#rendererContainer').innerWidth() * 9 / 16
                    };

                    $scope.renderer.setSize($scope.size.width, $scope.size.height);

                    $element.append(angular.element($scope.renderer.domElement));

                    $scope.controls = new THREE.OrbitControls($scope.camera, $scope.renderer.domElement);

                    // update the light position with the camera movement
                    $scope.controls.addEventListener('change', function () {
                        light.position.set($scope.camera.position.x, $scope.camera.position.y, $scope.camera.position.z);
                        $scope.render();
                    });

                    $scope.controls.noPan = true;

                    window.addEventListener('resize', $scope.onWindowResize, false);
                    window.addEventListener("orientationchange", $scope.onOrientationChange, false);
                    angular.element(document).bind('fullscreenchange', $scope.onFullScreenChange);

                    var light = new THREE.PointLight(0xffffff);
                    light.position.set(-100, 200, 100);
                    $scope.scene.add(light);

                    var ambientLight = new THREE.AmbientLight(0x4d4d4d);
                    console.log(ambientLight);
                    $scope.scene.add(ambientLight);

                    var loader;
                    if (objMatches != null && objMatches.length == 1) {
                        var url = meshApi.getMainFileUrl($attrs.modelid);
                        loader = new THREE.OBJLoader(manager, url);
                        loader.load(url, $scope.addObjectToScene, onProgress, onError);
                    }

                    if (stlMatches != null && stlMatches.length == 1) {
                        console.log("stl matches");
                        loader = new THREE.STLLoader();
                        loader.addEventListener('load', function (event) {
                            $scope.modelLoaded = true;
                            usSpinnerService.stop('spinner-1');
                            var geometry = event.content;
                            var mesh = new THREE.Mesh(geometry, new THREE.MeshPhongMaterial());

                            geometry.computeBoundingSphere();

                            var radius = geometry.boundingSphere.radius;

                            console.log(radius);

                            $scope.camera.position.x = radius;
                            $scope.camera.position.y = radius;
                            $scope.camera.position.z = radius;

                            console.log($scope.camera.position);

                            $scope.scene.add(mesh);
                        });
                        loader.load(meshApi.getMainFileUrl($attrs.modelid));
                    }

                    // var axes = buildAxes(1000);
                    // $scope.scene.add(axes);

                    $scope.updateSizeAndCamera();
                };

                function buildAxes(length) {
                    var axes = new THREE.Object3D();

                    axes.add(buildAxis(new THREE.Vector3(0, 0, 0), new THREE.Vector3(length, 0, 0), 0xFF0000, false)); // +X
                    axes.add(buildAxis(new THREE.Vector3(0, 0, 0), new THREE.Vector3(-length, 0, 0), 0xFF0000, true)); // -X
                    axes.add(buildAxis(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, length, 0), 0x00FF00, false)); // +Y
                    axes.add(buildAxis(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, -length, 0), 0x00FF00, true)); // -Y
                    axes.add(buildAxis(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, length), 0x0000FF, false)); // +Z
                    axes.add(buildAxis(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -length), 0x0000FF, true)); // -Z

                    return axes;

                }

                function buildAxis(src, dst, colorHex, dashed) {
                    var geom = new THREE.Geometry(),
                        mat;

                    if (dashed) {
                        mat = new THREE.LineDashedMaterial({linewidth: 3, color: colorHex, dashSize: 3, gapSize: 3});
                    } else {
                        mat = new THREE.LineBasicMaterial({linewidth: 3, color: colorHex});
                    }

                    geom.vertices.push(src.clone());
                    geom.vertices.push(dst.clone());
                    geom.computeLineDistances(); // This one is SUPER important, otherwise dashed lines will appear as simple plain lines

                    var axis = new THREE.Line(geom, mat, THREE.LinePieces);

                    return axis;

                }

                $scope.addModelToScene = function (geometry, materials) {

                    var material = new THREE.MeshFaceMaterial(materials);
                    material.overdraw = true;
                    _.forEach(material.materials, function (mat) {
                        mat.overdraw = true;
                    });

                    $scope.mesh = new THREE.Mesh(geometry, material);

                    geometry.computeBoundingBox();
                    geometry.computeBoundingSphere();

                    var box = geometry.boundingBox;
                    console.log(box);
                    var size = box.size();
                    $scope.mesh.position.set(0, -size.y / 2, 0);

                    var radius = geometry.boundingSphere.radius * 3;

                    $scope.camera.position.x = radius / 2;
                    $scope.camera.position.y = radius / 4;
                    $scope.camera.position.z = radius;

                    $scope.scene.add($scope.mesh);
                };

                $scope.addObjectToScene = function (object) {

                    $scope.modelLoaded = true;
                    usSpinnerService.stop('spinner-1');

                    object.children[0].geometry.computeBoundingSphere();

                    var radius = object.children[0].geometry.boundingSphere.radius;

                    console.log(radius);

                    $scope.camera.position.x = radius;
                    $scope.camera.position.y = radius;
                    $scope.camera.position.z = radius;

                    $scope.scene.add(object);

                };

                $scope.updateSizeAndCamera = function () {
                    if ($scope.isFullScreen()) {
                        $scope.size.width = window.innerWidth;
                        $scope.size.height = window.innerHeight;
                    } else {
                        $scope.size.width = angular.element('#rendererContainer').innerWidth();
                        $scope.size.height = angular.element('#rendererContainer').innerWidth() * 9 / 16;
                    }

                    console.log("Size: " + JSON.stringify($scope.size));

                    $scope.camera.aspect = $scope.size.width / $scope.size.height;
                    $scope.camera.updateProjectionMatrix();

                    $scope.renderer.setSize($scope.size.width, $scope.size.height);
                };

                $scope.onOrientationChange = function () {
                    $scope.updateSizeAndCamera();
                    console.log("onOrientationChange: " + JSON.stringify($scope.size));
                    $scope.render();
                };

                $scope.onWindowResize = function () {
                    $scope.updateSizeAndCamera();
                    console.log("onWindowResize: " + JSON.stringify($scope.size));
                    $scope.render();
                };

                $scope.animate = function () {
                    if (!done) {
                        requestAnimationFrame($scope.animate, $scope.renderer.domElement);
                        /*
                         mesh.rotation.x += 0.01;
                         mesh.rotation.y += 0.02;
                         */
                        $scope.controls.update();
                        $scope.render();
                    }
                };

                $scope.render = function () {
                    $scope.renderer.render($scope.scene, $scope.camera);
                };

                $scope.isFullScreen = function () {
                    return !!angular.element($scope.renderer.domElement).fullScreen();
                };

                $rootScope.toggleFullScreen = function () {
                    angular.element($scope.renderer.domElement).toggleFullScreen();
                    console.log("toggleFullScreen: " + JSON.stringify($scope.size));
                };

                $scope.onFullScreenChange = function (ev) {
                    console.log("onFullScreenChange: " + JSON.stringify($scope.size));
                    $scope.onWindowResize();
                };

                $scope.$on('$destroy', function () {
                    console.log("$destroy");

                    done = true;

                    $scope.scene.remove($scope.mesh);

                    $scope.mesh.geometry.dispose();
                    if ($scope.mesh.material instanceof THREE.MeshFaceMaterial) {
                        _.forEach($scope.mesh.material.materials, function (mat) {
                            mat.dispose();
                        });
                    } else {
                        $scope.mesh.material.dispose();
                    }

                    $scope.mesh = null;
                    $scope.scene = null;
                    $scope.camera = null;
                    $scope.controls = null;
                    $scope.renderer = null;
                });

                $rootScope.getScreenshotDataUrl = function () {
                    return THREEx.Screenshot.toDataURL($scope.renderer, "img/png");
                };

                $scope.init();
                $scope.animate();
            }
        };
    })

    .directive('modelComment', function () {
        return {
            restrict: 'E',
            transclude: true,
            replace: true,
            scope: {
                authorName: '@author',
                authorImg: '@avatar',
                commentDate: '@date',
                loggedUsername: '@loggedusername',
                removeComment: '&'
            },
            templateUrl: 'model/modelcomment.tpl.html'
        };
    })

    .config(function config($stateProvider) {
        $stateProvider.state('home.model', {
            url: '/model/:id',
            controller: 'ModelCtrl',
            templateUrl: 'model/model.tpl.html',
            data: {pageTitle: 'Model | Mesh'}
        });
    })

    .controller('ModelCtrl', function ModelController($scope, $stateParams, $http, server, meshApi, ngDialog, $state, $modal, _, toastr) {

        $scope.modelLoaded = false;
        $scope.isLoggedIn = meshApi.isLoggedIn();
        if ($scope.isLoggedIn) {
            $scope.loggedUsername = meshApi.getLoggedUsername();
            $scope.loggedAvatar = meshApi.getLoggedAvatar();
        }

        $scope.init = function () {
            $scope.newModel = {};
            meshApi.getModel($stateParams.id). // TODO: make url configurable?
                success(function (data, status, headers, config) {
                    $scope.model = data.model;
                    console.log("MODEL:", $scope.model);
                    $scope.favourited = data.favourited;
                    $scope.userVote = data.uservote;
                    $scope.followingAuthor = data.followingAuthor;
                    $scope.ownsModel = data.ownsModel;

                    $scope.hasMoreComments = $scope.model.comments.length > 9;

                    $scope.newModel.description = $scope.model.description;
                    $scope.newModel.tags = $scope.model.tags.slice(0); //clone
                    $scope.newModel.visibility = $scope.model.isPublic ? 'public' : 'private';
                }).
                error(function (err) {
                    alert("The model could not be retrieved: " + err.message); //TODO redirect to error page
                });
        };

        $scope.tabs = {comments: false, details: true, settings: false};

        $scope.newComment = '';
        $scope.submitNewComment = function ($event) {
            var elem = angular.element($event.currentTarget);
            if (elem.hasClass('disabled')) {
                return;
            }
            elem.addClass('disabled');
            meshApi.addComment($stateParams.id, $scope.newComment).
                success(function (data, status, headers, config) {
                    $scope.model.comments.unshift(data);
                    $scope.newComment = '';
                    elem.removeClass('disabled');
                }).
                error(function (data, status, headers, config) {
                    alert('Error ' + status + ' occurred: ' + data.message);
                    elem.removeClass('disabled');
                });
        };
        $scope.loadMoreComments = function ($event) {
            var elem = angular.element($event.currentTarget);
            if (elem.hasClass('hidden')) {
                return;
            }
            elem.addClass('hidden');
            meshApi.getComments($stateParams.id, $scope.model.comments[$scope.model.comments.length - 1].date).
                success(function (data, status, headers, config) {
                    console.log(data);
                    for (var i = 0; i < data.length; ++i) {
                        $scope.model.comments.push(data[i]);
                    }
                    if (data.length >= 10) {
                        elem.removeClass('hidden');
                    }
                }).
                error(function (data, status, headers, config) {
                    alert('Error ' + status + ' occurred: ' + data.message);
                    elem.removeClass('hidden');
                });
        };
        $scope.removeComment = function (date) {
            ngDialog.openConfirm({
                template: 'modalDialogId',
                className: 'ngdialog-theme-default'
            }).then(function () {
                for (var i = 0; i < $scope.model.comments.length; ++i) {
                    if ($scope.model.comments[i].date === date && $scope.model.comments[i].author === $scope.loggedUsername) {
                        $scope.model.comments.splice(i, 1);
                        break;
                    }
                }
                meshApi.removeComment($scope.model.id, date).
                    success(function (data, status, headers, config) {

                    }).
                    error(function (data, status, headers, config) {
                        alert('Error ' + status + ' occurred: ' + data.message);
                    });
            });
        };
        var processingVote = false;
        $scope.upvote = function () {
            if (!$scope.isLoggedIn) {
                ngDialog.openConfirm({
                    template: 'logInToVoteDialogId',
                    className: 'ngdialog-theme-default',
                    scope: $scope
                }).then(function () {
                    // do nothing
                });
                return;
            }
            if (processingVote) {
                return;
            }
            processingVote = true;
            if ($scope.userVote == 'UP') {
                meshApi.deleteModelVote($scope.model.id).
                    success(function () {
                        if ($scope.userVote == 'UP') {
                            $scope.model.upvotes--;
                        }
                        $scope.userVote = '';
                        processingVote = false;
                    }).
                    error(function (data, status, headers, config) {
                        alert('Error ' + status + ' occurred: ' + data.message);
                        processingVote = false;
                    });
            }
            else {
                meshApi.addModelVote($scope.model.id, 'UP').
                    success(function (data, status, headers, config) {
                        if ($scope.userVote == 'DOWN') {
                            $scope.model.downvotes--;
                        }
                        $scope.userVote = 'UP';
                        $scope.model.upvotes++;
                        processingVote = false;
                    }).
                    error(function (data, status, headers, config) {
                        alert('Error ' + status + ' occurred: ' + data.message);
                        processingVote = false;
                    });
            }
        };

        $scope.downvote = function () {
            if (!$scope.isLoggedIn) {
                ngDialog.openConfirm({
                    template: 'logInToVoteDialogId',
                    className: 'ngdialog-theme-default',
                    scope: $scope
                }).then(function () {
                    // do nothing
                });
                return;
            }
            if (processingVote) {
                return;
            }
            processingVote = true;
            if ($scope.userVote == 'DOWN') {
                meshApi.deleteModelVote($scope.model.id).
                    success(function (data, status, headers, config) {
                        if ($scope.userVote == 'UP') {
                            $scope.model.upvotes--;
                        }
                        $scope.userVote = '';
                        processingVote = false;
                    }).
                    error(function (data, status, headers, config) {
                        alert('Error ' + status + ' occurred: ' + data.message);
                        processingVote = false;
                    });
            }
            else {
                meshApi.addModelVote($scope.model.id, 'DOWN').
                    success(function (data, status, headers, config) {
                        if ($scope.userVote == 'UP') {
                            $scope.model.upvotes--;
                        }
                        $scope.userVote = 'DOWN';
                        $scope.model.downvotes++;
                        processingVote = false;
                    }).
                    error(function (data, status, headers, config) {
                        alert('Error ' + status + ' occurred: ' + data.message);
                        processingVote = false;
                    });
            }
        };

        var processingFavouriteRequest = false;
        $scope.favouriteModel = function () {
            if (processingFavouriteRequest) {
                return;
            }
            processingFavouriteRequest = true;
            var apiCall = $scope.favourited ? meshApi.removeModelFromFavourites : meshApi.addModelToFavourites;
            apiCall($scope.model.id).
                success(function (data, status, headers, config) {
                    $scope.favourited = !$scope.favourited;
                    processingFavouriteRequest = false;
                }).
                error(function (data, status, headers, config) {
                    alert('Error ' + status + ' occurred: ' + data.message);
                    processingFavouriteRequest = false;
                });
        };

        var processingFollowingRequest = false;
        $scope.followAuthor = function () {
            if (processingFollowingRequest) {
                return;
            }
            processingFollowingRequest = true;
            var fapiCall = $scope.followingAuthor ? meshApi.unfollowUser : meshApi.followUser;
            fapiCall($scope.model.author.name).
                success(function (data, status, headers, config) {
                    $scope.followingAuthor = !$scope.followingAuthor;
                    processingFollowingRequest = false;
                }).
                error(function (data, status, headers, config) {
                    alert('Error ' + status + ' occurred: ' + data.message);
                    processingFollowingRequest = false;
                });
        };
        $scope.downloadModel = function () {
            console.log(meshApi.getDownloadModelUrl($scope.model.id));
            window.open(meshApi.getDownloadModelUrl($scope.model.id), "_blank");
        };
        $scope.exportModel = function () {
            alert('Export to dropbox not yet implemented');
        };
        $scope.updateModel = function () {
            var tagsText = _.pluck($scope.newModel.tags, 'text');
            var isPublic = $scope.newModel.visibility == 'public';
            meshApi.updateModel($scope.model.id, $scope.newModel.description, isPublic, tagsText)
                .success(function (model) {
                    $scope.model.description = model.description;
                    $scope.newModel.description = model.description;
                    $scope.newModel.visibility = model.isPublic ? 'public' : 'private';
                    $scope.model.tags = model.tags.slice(0);
                    $scope.newModel.tags = model.tags;

                    ngDialog.openConfirm({
                        template: 'updateSuccessModelDialogId',
                        className: 'ngdialog-theme-default'
                    }).then(function () {
                        // do nothing
                    });
                })
                .error(function (error) {
                    console.log("error:", error);
                });
            //console.log("update model", $scope.newModel);
            //alert('Save model not yet implemented');
        };


        $scope.publishToGalleries = function () {

            var modalInstance = $modal.open({
                templateUrl: 'galleriesSelectiondId',
                controller: 'GalleryPublishModalInstanceCtrl',
                size: 'lg',
                resolve: {
                    authorName: function () {
                        return $scope.model.author.name;
                    }
                }
            });

            modalInstance.result.then(function (selectedGalleries) {
                console.log(selectedGalleries);
                meshApi.updateModelGalleries($scope.model.id, selectedGalleries)
                    .success(function () {
                        //alert("Success");
                        toastr.success('The model was successfully published', 'Model Publishing');
                    })
                    .error(function (response) {
                        toastr.error('Error publishing model ' + JSON.stringify(response), 'Model Publishing');
                    });
            }, function () {
                // do nothing, cancelled
            });
        };

        $scope.publishToGroups = function () {
            var modalInstance = $modal.open({
                templateUrl: 'groupsSelectionId',
                controller: 'GroupPublishModalInstanceCtrl',
                size: 'lg',
                resolve: {
                    authorName: function () {
                        return $scope.model.author.name;
                    }
                }
            });

            modalInstance.result.then(function (selectedGroups) {
                meshApi.updateModelPublishedGroups($scope.model.id, selectedGroups)
                    .success(function () {
                        toastr.success("", "The model was successfully published");
                    })
                    .error(function (response) {
                        toastr.error("Error publishing model", JSON.stringify(response));
                    });
            }, function () {
                // do nothing, cancelled
            });
        };

        var resizeImage = function (url, width, height, callback) {
            var sourceImage = new Image();

            sourceImage.onload = function () {
                // Create a canvas with the desired dimensions
                var canvas = document.createElement("canvas");
                canvas.width = width;
                canvas.height = height;

                // Scale and draw the source image to the canvas
                canvas.getContext("2d").drawImage(sourceImage, 0, 0, width, height);

                // Convert the canvas to a data URL in PNG format
                callback(canvas.toDataURL());
            };

            sourceImage.src = url;
        };

        $scope.takeScreenshot = function () {
            var screenshotUrl = $scope.getScreenshotDataUrl();
            var $textAndPic = $('<div></div>');
            resizeImage(screenshotUrl, 290, 163, function (resizedUrl) {
                $textAndPic.append('<img class="center-block" src="' + resizedUrl + '" />');

                ngDialog.openConfirm({
                    template: 'changeScreenShotDialogId',
                    className: 'ngdialog-theme-default',
                    data: screenshotUrl
                }).then(function (data) {
                        meshApi.replaceModelThumbnail($scope.model.id, screenshotUrl)
                            .success(function() {
                                toastr.success("", "Thumbnail successfully updated");
                            })
                            .error(function(data) {
                                toastr.error("", "Error updating thumbnail:" + JSON.stringify(data));
                            });
                        console.log("Ok clicked");
                    });
            });
        };

        $scope.deleteModel = function () {

            ngDialog.openConfirm({
                template: 'deleteModelDialogId',
                className: 'ngdialog-theme-default'
            }).then(function () {
                meshApi.deleteModel($scope.model.id)
                    .success(function () {
                        ngDialog.open({
                            template: 'deleteSuccessModelDialogId',
                            className: 'ngdialog-theme-default'
                        }).closePromise.then(function () {
                            $state.go('home.catalog');
                        });
                    })
                    .error(function (data) {
                        $scope.modelDeleteErrorMessage = data.message ? data.message : data;
                        ngDialog.openConfirm({
                            template: 'deleteErrorModelDialogId',
                            className: 'ngdialog-theme-default',
                            scope: $scope
                        }).then(function () {
                            // do nothing
                        });
                    });
            });
        };
    })
    .controller('GalleryPublishModalInstanceCtrl', function ($scope, $modalInstance, authorName, _, meshApi) {

        meshApi.getAllGalleries(authorName)
            .success(function (response) {
                $scope.galleries = _.pluck(response, 'name');
            });
        $scope.selection = {
            galleries: {}
        };

        $scope.ok = function () {

            var selectedGalleries = Object.keys(_.pick($scope.selection.galleries, function (value, key) {
                return value;
            }));

            $modalInstance.close(selectedGalleries);
        };

        $scope.cancel = function () {
            $modalInstance.dismiss('cancel');
        };
    })
    .controller('GroupPublishModalInstanceCtrl', function ($scope, $modalInstance, authorName, _, meshApi) {
        meshApi.getUserGroups(authorName)
            .success(function (data) {
                $scope.groups = data;
            });

        $scope.selection = {
            groups: {}
        };

        $scope.ok = function () {

            var selectedGroups = Object.keys(_.pick($scope.selection.groups, function (value, key) {
                return value;
            }));

            $modalInstance.close(selectedGroups);
        };

        $scope.cancel = function () {
            $modalInstance.dismiss('cancel');
        };
    });