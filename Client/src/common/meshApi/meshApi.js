angular.module('meshApp').factory('meshApi', function ($http, server) {
    return {
        init: function (token) {
            $http.defaults.headers.Authorization = 'Bearer ' + token;
        },
        addComment: function (modelId, comment) {
            return $http.post(server.url + '/models/' + modelId + '/comments', {comment: comment});
        }
    };
});