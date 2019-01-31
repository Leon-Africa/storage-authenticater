//@author Leon Africa
angular.module('cognito_app.controllers', ['ui.bootstrap'])

    .controller('connector', ['$scope', '$timeout', '$window', function($scope, $timeout, $window, $location, $state, socialLoginService) {


        //Broadcast login with social FB
        $scope.$on('event:social-sign-in-success', (event, userDetails) => {
            $scope.result = userDetails;
            var provider = $scope.result.provider;
            //set the token value based on provider
            if (provider == "google") {
                var token = $scope.result.idToken;
            } else if (provider == "facebook") {
                var token = $scope.result.token;
            }

            var check = "first";
            $scope.$applyAsync;
            var check2 = localStorage.getItem("check");

            //eliminate repetative behaviour
            if (check == "first") {

                if (check2 == "second") {
                    console.log("Ignore repetative behaviour on $scope.$on");
                } else {
                    $scope.getAWS_Keys(token, provider);
                    var check = localStorage.setItem("check", "second");
                }
            }



        });



        $scope.$on('event:social-sign-out-success', function(event, userDetails) {
            $scope.result = userDetails;

        });



        //var AWS = require('aws-sdk');
        AWS.config.region = 'us-east-1'; // Region


        //get identity pool id value global aswell
        var identity_pool_id = 'us-east-1:eeba2f99-9aaf-40c6-b4e6-556cbd440d8f';

        //get user pool logins map value global aswell
        var userpool_token_uri = 'cognito-idp.us-east-1.amazonaws.com/us-east-1_U6dsHOXX5';


        //Variables for the userpool

        var userPoolId = 'us-east-1_U6dsHOXX5';

        //DON"T GENERATE SECRET KEY FOR BROWSER JS
        var clientId = '6nk5taild13664a0bpaokfrsl2';

        //The User pool Data
        var poolData = {
            UserPoolId: 'us-east-1_U6dsHOXX5',
            ClientId: '6nk5taild13664a0bpaokfrsl2'
        };

        //Your S3 Bucket
        var bucketName = 'the-s3bucket';

        //Security concerns due to random number genearation using sjcl
        //May call sjcl.ransdom.startCollectors()  
        //More Info: https://github.com/bitwiseshiftleft/sjcl/issues/77 
        var paranoia = 7;

        var email_attribute;
        var password;
        var signup_error;

        //Set Userpool Configurations
        $scope.signup_User = function(userPoolId, clientId, paranoia, email_attribute, password) {

            //Instantiate the service for userpool
            var userPool = new
            AWSCognito.CognitoIdentityServiceProvider.CognitoUserPool(poolData);


            //Set Paranoia via object method
            //userPool.setParanoia($scope.Paranoia);

            var attributeList = [];

            var dataEmail = {
                Name: 'email',
                Value: email_attribute
            };


            //Instatiate userdata in service provider
            var attributeEmail = new AWSCognito.CognitoIdentityServiceProvider.CognitoUserAttribute(dataEmail);

            //signup method for userpool expects a string
            $scope.password = JSON.stringify(password).replace('"', '').replace('"', '');

            //Stringyfy causes username to be of form "email_attribute" in Cognito, therefore replace '""' so that email_attribute may appear of satisfactory form: email_attribute
            $scope.email_attribute = JSON.stringify(email_attribute).replace('"', '').replace('"', '');


            //Push to Cognito
            attributeList.push(attributeEmail);

            userPool.signUp($scope.email_attribute, $scope.password, attributeList, null, function(err, result) {
                if (err) {

                    $scope.signup_error_message = err;
                    signup_error = 1

                    $scope.signup_error = signup_error;


                    return;

                } else {
                    cognitoUser = result.user;

                    //Store user in scope
                    $scope.cognitoUser = cognitoUser;
                    cognitoUser = $scope.cognitoUser;


                    $scope.result_object = JSON.stringify(result);

                    $scope.info = JSON.stringify(cognitoUser);
                    alert("signup success!")

                    console.log("the user" + $scope.info);

                    console.log("the result" + $scope.result_object);
                }


            });

        }



        //Get user details and call signup_User() 
        $scope.register = function() {

            if ($scope.form.$valid) {

                //send to apigateway
                // The user details
                var email = $scope.obj.login_email; //username regex=[\p{L}\p{M}\p{S}\p{N}\p{P}]+ 
                var password = $scope.obj.login_password;

                //Check that the password is numbers only
                if (isNaN(password)) {

                    // alert("Password MUST contain numbers only. \n Please renter password to continue."); 
                    swal("Password MUST contain numbers only!", "Please renter password to continue.", "warning");

                } else { //username and password ok


                    $scope.email = email;
                    $scope.password = password;

                    //Signup user
                    $scope.signup_User($scope.userPoolId, $scope.clientId, $scope.paranoia, $scope.email, $scope.password);

                    console.log("RAN!");

                }



                //time delay incase of error
                $timeout(function() {



                    if ($scope.signup_error != 1) {
                        //Request Verification code
                        swal({
                                title: "Verification code",
                                text: "Please enter verification code to your email address:",
                                type: "input",
                                showCancelButton: false,
                                closeOnConfirm: false,
                                showLoaderOnConfirm: false,
                                animation: "slide-from-top",
                                inputPlaceholder: "Your verification code"
                            },

                            function(inputValue) {
                                if (!isNaN(inputValue))

                                    //Run the method to process the confirmation code
                                    //if valid show success else error

                                    //split string and see if contain a combination of 0-9

                                    cognitoUser.confirmRegistration(inputValue, true, function(err, result) {
                                        if (err) {
                                            //swal("Error!", err, "error");
                                            swal.showInputError(err);
                                            return;
                                        } else if (result != "success") {

                                            swal("Success!", "You may now sign in using: " + $scope.email, "success");

                                        }

                                    });


                                return false;

                                if (inputValue === "")
                                    swal.showInputError("Please enter your verification code to continue.");
                                return false
                                if (inputValue == null) {
                                    swal.showInputError("Please enter your verification code to continue.");
                                    return false
                                }

                            });
                    } else {

                        swal("Error!", "" + $scope.signup_error_message, "error");

                    }

                }, 3000);

            }

        }


        //Get the login Credentials to log user in
        $scope.login = function() {

            //get data 
            var login_name = $scope.obj.login_email;
            var login_password = $scope.obj.login_password;

            //store in scope
            $scope.login_name = login_name;
            $scope.login_password = login_password;

            //Authenticate the user
            $scope.authenticateUser($scope.login_name, $scope.login_password);

        }


        //Sign in the user
        $scope.authenticateUser = function(login_name, login_password) {

            //Authenticate User into the userpool
            var authenticationData = {
                Username: login_name,
                Password: login_password
            };


            var authenticationDetails = new AWSCognito.CognitoIdentityServiceProvider.AuthenticationDetails(authenticationData);

            //Instantiate the userpool
            var userPool = new AWSCognito.CognitoIdentityServiceProvider.CognitoUserPool(poolData);

            //Establish the userdata
            var userData = {
                Username: login_name,
                Pool: userPool
            };

            //Instantiate the provider with the user data
            var cognitoUser = new AWSCognito.CognitoIdentityServiceProvider.CognitoUser(userData);

            //Authenticate the user 
            cognitoUser.authenticateUser(authenticationDetails, {
                onSuccess: function(result) {

                    /*Use the idToken for Logins Map when Federating User Pools with Cognito Identity or when passing through an Authorization Header to an API Gateway Authorizer*/
                    //@update you can send token via API Gatewat to Lambda

                    $scope.id_token = result.idToken.jwtToken;
                    $scope.access_token = result.getAccessToken().getJwtToken();


                    swal("Welcome!", "You have successfully signed in: " + login_name, "success");


                    //Decode the token to json
                    //get the username and save it
                    //Create folder in S3 using Username
                    //username is the sub when email is used as username
                    var decoded = jwt_decode($scope.id_token);

                    var username = decoded.sub;

                    $scope.username = username;

                    $scope.getAWS_Keys($scope.id_token, "userpool");

                    $scope.login_name = login_name;


                },

                onFailure: function(err) {
                    //alert(err);
                    //
                    var error_code = err.code;
                    var error_message = err.message;

                    swal(error_code, error_message, "error");

                },

            });
        }




        //This function needs to be way more abstarct 
        //Dont create folders here 
        //just get the keys

        $scope.getAWS_Keys = function(token, provider) {

            // Initialize the Amazon Cognito credentials provider
            // the_id_token_userpool


            //token coming from facebook
            if (provider == "facebook") {
                //Do the logins map for facebook
                console.log("user logged in with facebook");


                //The IAM Role that is on the ID pool is assumed via the Linked Login
                //The facebook user can be signed up to the userpool in a group that assumes the same IAM role
                //This will persist the user data in the userpool as well

                AWS.config.credentials = new AWS.CognitoIdentityCredentials({
                    IdentityPoolId: identity_pool_id,

                    Logins: {
                        // set the logins mmap
                        'graph.facebook.com': token
                        //'graph.facebook.com': token
                    }


                });

            }
            //token coming from google
            else if (provider == "google") {
                //Set the logins map 
                console.log("user logged in with google");
                AWS.config.credentials = new AWS.CognitoIdentityCredentials({
                    IdentityPoolId: identity_pool_id,

                    Logins: {
                        // set the logins mmap
                        'accounts.google.com': token

                    }


                });
            }
            //token coming from userpool
            else if (provider == "userpool") {
                //Do the logins map for userpool
                console.log("user logged in with userpool");
                AWS.config.credentials = new AWS.CognitoIdentityCredentials({
                    IdentityPoolId: identity_pool_id,

                    Logins: {
                        // set the logins mmap
                        'cognito-idp.us-east-1.amazonaws.com/us-east-1_U6dsHOXX5': token

                    }


                });

            }
            //some sort of error coming up
            else {
                alert("token provider error");

            }



            //You have to call refresh method to sync with federated identites

            AWS.config.credentials.refresh((error) => {
                if (error) {
                    console.error(error);
                } else {
                    console.log('Successfully logged!');

                    //get the idenity id
                    //$scope.identityId = AWS.config.credentials.identityId;

                    if (AWS.config.credentials.identityId == null) {

                        console.log("There is repetative behaviour on $scope.$on");

                    } else {


                        $scope.identityId = AWS.config.credentials.identityId;
                        //create a dataset
                        //$scope.create_data_set();

                        //create the users folder
                        $scope.create_folder($scope.identityId);
                        //Go to logged in page
                        $scope.change_page('#/welcome');



                        console.log("Cognito Identity Id: " + AWS.config.credentials.identityId);

                        console.log(AWS.config.credentials);

                        var id = AWS.config.credentials.identityId;

                        //store config in local storage
                        localStorage.setItem('identityId', id);

                    }

                }

            });
        }


        $scope.change_page = function(page) {
            $window.location.assign(page);
        }

        //on sign in create a folder for this user
        $scope.create_folder = function(identity_id) {

            var s3 = new AWS.S3();

            //you must add "/" to create a folder
            var keyName = identity_id + "/";

            //alert(keyName);

            var params = {
                Bucket: bucketName,
                Key: keyName,
                //Body: 'Hello World!'
            };

            s3.putObject(params, function(err, data) {
                if (err)
                    console.log(err)
                else
                    console.log("Successfully created " + bucketName + "/" + keyName);
            });
        }


        //variables for file
        $scope.fileContent = '';
        $scope.fileSize = 0;
        $scope.fileName = '';

        $scope.submit = function() {

            var file = document.getElementById("myFileInput").files[0];
            if (file) {

                //There is a file so name it
                swal({
                        title: "Name your File",
                        text: "Write a name for your image:",
                        type: "input",
                        showCancelButton: true,
                        closeOnConfirm: false,
                        showLoaderOnConfirm: true,
                        animation: "slide-from-top",
                        inputPlaceholder: "The name for your file"
                    },

                    function(inputValue) {

                        if (inputValue === false) return false;
                        //iIf there is no value 
                        if (Object.keys(inputValue).length == 0) {


                            $timeout(function() {
                                swal("Warning!", "Please enter a file name in order to upload", "warning");
                            }, 100);

                            return;


                        }



                        //there is a value
                        if (inputValue !== "")

                            //alert("test");

                            var aReader = new FileReader();
                        aReader.readAsText(file, "UTF-8");
                        aReader.onload = function(evt) {


                            //get the file extention
                            var extension = document.getElementById("myFileInput").files[0].name.split('.').pop().toLowerCase();

                            //alert(extension);

                            var the_file_with_extension = inputValue + "." + extension;

                            $scope.file_name = the_file_with_extension;
                            $scope.file = file;
                            console.log(aReader.result);

                            $scope.upload($scope.file_name, $scope.file); //upload the file to s3

                        }
                        aReader.onerror = function(evt) {
                            document.getElementById("myFileInput").innerHTML = "error";
                            $scope.fileContent = "error";
                        }

                    });


            }
            //file was not yet choosen
            else {
                swal("Warning!", "Please first choose a file", "warning");
            }
        }

        //upload user data to folder
        $scope.upload = function(file_name, file) {

            var id2 = localStorage.getItem("identityId");

            console.log(id2);


            var s3 = new AWS.S3();

            //store into the user folder
            var keyName = id2 + "/" + file_name;

            //path to file
            localStorage.setItem("keyname", keyName);

            var params = {
                Bucket: bucketName,
                Key: keyName,
                Body: file
            };

            s3.putObject(params, function(err, data) {
                if (err)

                    swal("Error!", err + " Please sign in to start a new session", "error");
                else


                    swal("Success!", "Uploaded : " + file_name, "success");
            });

        }

        $scope.GetAllObjects = function() {
            var s3 = new AWS.S3();
            var identity_id_key = localStorage.getItem("identityId"); //the key in the bucket is the user identity id
            var path = identity_id_key + "/"; //adding /
            var params = {
                Bucket: bucketName,
                /* required */
                Delimiter: "/",
                Prefix: path

            };
            s3.listObjects(params, function(err, data) {
                if (err) console.log(err, err.stack); // an error occurred
                else console.log(data); // successful response
            });

        }



        //log the user out of the app
        //ensure that clear local storage because that cache the identity id 
        $scope.logout = function() {

            swal({
                title: "",
                text: "You have logged out",
                timer: 2000,
                showConfirmButton: false
            });
            localStorage.clear();

            $scope.change_page('/');
        }




        $scope.viewFiles = function() {

            //get the files from S3
            $scope.getUserData_S3(bucketName);

        }

        //File collector for S3
        //Use the identity id -> the folder name
        //And the bucket name 
        $scope.getUserData_S3 = function(bucketName) {

            //Get the user identity id 
            var id2 = localStorage.getItem("identityId"); //is this is scope of #uploaded?

            var theexactfile = localStorage.getItem("keyname");

            var s3 = new AWS.S3();

            var params = {
                Bucket: bucketName,
                Key: theexactfile
            };

            s3.getObject(params, function(err, data) {
                if (err) console.log(err, err.stack); // an error occurred
                else //console.log(data); // successful response
                    $timeout(function() {
                        $scope.s3url = "data:image/jpeg;base64," + $scope.encode(data.Body);

                        var image_string = data.Body;

                        var test_all = data;

                        $scope.test_all = data;

                        //this if the user wants this image to be synced to Cognito Sync
                        $scope.image_selected_base64 = image_string;

                        //alert($scope.s3url);
                    }, 1);

            });

        }




        $scope.encode = function(data) {
            var str = data.reduce(function(a, b) {
                return a + String.fromCharCode(b)
            }, '');
            return btoa(str).replace(/.{76}(?=.)/g, '$&\n');

        }

        $scope.downloadfile = function(item) {


            var s3 = new AWS.S3();
            console.log(item.Key);

            var the_key = JSON.stringify(item.Key).replace('"', '').replace('"', '');



            var params = {
                Bucket: bucketName,
                Key: the_key,
                Expires: 60
            };

            var url = s3.getSignedUrl('getObject', params);




            //Download, Delete or showCancelButton
            swal({
                title: "File Download",
                text: "Click to download your file",
                type: "info",
                showCancelButton: true,
                confirmButtonColor: "#DD6B55",
                confirmButtonText: "Download",
                closeOnConfirm: true,
                html: false
            }, function() {

                window.open(url, '');

            });

            console.log("get URL is", url);

        }


        $scope.getAllData = function() {


            //The image path has to be taken based on the file type that is saved
            var imagePath = 'img/cognito.png';

            $scope.imagePath = 'img/file.png';


            //Get eachfiles meta data in S3 with respective presignurl

            //get the file name

            //Extract the extention on the file based on the extention select an image

            //ng click opens the presignurl


            //List all the objects in the directory
            var s3 = new AWS.S3();
            var identity_id_key = localStorage.getItem("identityId"); //the key in the bucket is the user identity id
            var path = identity_id_key + "/"; //adding /
            var params = {
                Bucket: bucketName,
                /* required */
                Delimiter: "/",
                Prefix: path

            };
            s3.listObjects(params, function(err, data) {
                if (err) console.log(err, err.stack); // an error occurred
                else
                    console.log(data.Contents);
                // successful response
                //timeout of 5seconds wating for data from s3

                $timeout(function() {

                    $scope.responseArray = data.Contents;
                }, 3000);

            });


        }



        //get an image from sync based on input and display it
        $scope.getSyncImage = function() {

            client = new AWS.CognitoSyncManager();


            //Request File name
            swal({
                    title: "Name your File",
                    text: "Write a name for your image:",
                    type: "input",
                    showCancelButton: false,
                    closeOnConfirm: true,
                    showLoaderOnConfirm: false,
                    animation: "slide-from-top",
                    inputPlaceholder: "The name for your file"
                },

                function(inputValue) {
                    if (inputValue !== "")

                        //Here at sycn data load the binary data the image files into the sync data set


                        var the_value = inputValue;



                    client.openOrCreateDataset('user_images', function(err, dataset) {
                        dataset.synchronize({

                            onSuccess: function(dataset, newRecords) {

                                //<!-- Read Records -->
                                dataset.get(the_value, function(err, value) {

                                    if (value == null) {

                                        swal("Error!", "That image does not exist. Please enter a correct image file name", "error");

                                    } else {


                                        //parse to json
                                        var obj = JSON.parse(value);
                                        var body = obj.Body;

                                        //display the image in the view
                                        the_image = "data:image/jpeg;base64," + $scope.encode(body.data);

                                        $timeout(function() {

                                            $scope.Newurl = the_image;

                                        }, 5);
                                    }

                                });

                            },

                            onFailure: function(err) {
                                console.log("error when calling data.synchronize: " + err);
                            },

                        });

                    });

                    return false;

                    if (inputValue === "") {
                        swal.showInputError("Please enter a file name to continue");
                        return false
                    }

                });

        }


        //Need a method with user option to delete folder in S3
        //Or delete a specific image

    }]);