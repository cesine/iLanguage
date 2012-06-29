var cradle        = require('cradle')
      ,everyauth  = require('everyauth')
      ,_          = require('underscore')
      ,Backbone   = require('backbone')
      ,MotherMayI = require('mothermayi').MotherMayI
      ,redis      = require('redis')
      ,util       = require('util');
var apphttpsdomain = "https://localhost:3001";

var authconf = require('./everyauthconfig');
everyauth.debug = true;


var usersById = {};
var nextUserId = 0;

function addUser(source, sourceUser) {
  var user;
  if (arguments.length === 1) { // password-based
    user = sourceUser = source;
    user.id = ++nextUserId;
    return usersById[nextUserId] = user;
  } else { // non-password-based
    user = usersById[++nextUserId] = {
      id : nextUserId
    };
    user[source] = sourceUser;
  }
  return user;
}

var usersByDropboxId = {};
var usersByFbId = {};
var usersByGhId = {};
var usersByTwitId = {};
var usersByGoogleId = {};
var usersByYahooId = {};
var usersByGoogleHybridId = {};
var usersByOpenId = {};
var usersByEvernoteId = {};
var usersByLogin = {
  'brian@example.com' : addUser({
    login : 'brian@example.com',
    password : 'password'
  })
};

everyauth.everymodule.findUserById(function(id, callback) {
  callback(null, usersById[id]);
});

everyauth.twitter.consumerKey(authconf.twitter.consumerKey).consumerSecret(
    authconf.twitter.consumerSecret).findOrCreateUser(
    function(session, accessToken, accessTokenSecret, twitterUserData) {
      var promise = this.Promise();
      findOrCreateByTwitterData(twitterUserData, accessToken,
          accessTokenSecret, promise);
      return promise;
    }).redirectPath(apphttpsdomain+'#user');

/*
 * This is the original twitter, here to see how it compares with the promise version above
 */
//everyauth.twitter.consumerKey(conf.twit.consumerKey).consumerSecret(
//    conf.twit.consumerSecret).findOrCreateUser(
//    function(sess, accessToken, accessSecret, twitUser) {
//      return usersByTwitId[twitUser.id]
//          || (usersByTwitId[twitUser.id] = addUser('twitter', twitUser));
//    }).redirectPath('/');


everyauth.password.loginWith('email').getLoginPath('/login').postLoginPath(
    '/login').loginView('login.jade')
//  .loginLocals({
//    title: 'Login'
//  })
//  .loginLocals(function (req, res) {
//    return {
//      title: 'Login'
//    }
//  })
.loginLocals(function(req, res, done) {
  setTimeout(function() {
    done(null, {
      title : 'Async login'
    });
  }, 200);
}).authenticate(function(login, password) {
  var errors = [];
  if (!login)
    errors.push('Missing login');
  if (!password)
    errors.push('Missing password');
  if (errors.length)
    return errors;
  var user = usersByLogin[login];
  if (!user)
    return [ 'Login failed' ];
  if (user.password !== password)
    return [ 'Login failed' ];
  return user;
})

.getRegisterPath('/register.html').postRegisterPath('/register').registerView(
    'register.jade')
.registerLocals(function(req, res, done) {
  setTimeout(function() {
    done(null, {
      title : 'Async Register'
    });
  }, 200);
}).validateRegistration(function(newUserAttrs, errors) {
  var login = newUserAttrs.login;
  if (usersByLogin[login])
    errors.push('Login already taken');
  return errors;
}).registerUser(function(newUserAttrs) {
  var login = newUserAttrs[this.loginKey()];
  return usersByLogin[login] = addUser(newUserAttrs);
})
.loginSuccessRedirect(apphttpsdomain+'#user').registerSuccessRedirect(apphttpsdomain+'#user');


// Test creating a Backbone model 
console.log("Loading the Users");
var b = new Backbone.Model({name: "hi"});
console.log(util.inspect(b));

var couchkeys = require('../couchkeys');
// Test inserting the Backbone model into CouchDB
var c = new cradle.Connection("http://localhost", 5984, {
  auth: { username: couchkeys.username, password: couchkeys.password}
});
c.database('test_insert').save(b.toJSON(), function(err, res) {
  if (err) {
    console.log("ERROR inserting into CouchDB:");
    console.log(util.inspect(err));
  } else {
    console.log('Inserted into CouchDB:');
    console.log(util.inspect(res));
  }
});

// Test Redis
console.log("Loading redis permissions");
//https://github.com/mranney/node_redis/blob/master/examples/web_server.js
var mayi = new MotherMayI('localhost', 6379, 0);
mayi.grant('user:Bilbo', 'wear', 'TheOneRing', function(success) {});
mayi.may('user:Bilbo', 'wear', 'TheOneRing', function(may) {
  if(may) {
      console.log('Bilbo may where the One Ring!');
  } else {
      console.log('Bilbo may NOT wear the One Ring');
  }
});


var users = c.database("users");
exports.findOrCreateByTwitterData = function(twitterUserData, accessToken, accessTokenSecret, promise) {
  users.view('docs/twitterId', {key: twitterUserData.id_str}, function(err, docs) {
    if (err) {
      console.log("Error using users/_design/docs/_view/twitterId:");
      console.log(err);
      promise.fail(err);
      return;
    }
    if (docs.length > 0) {
      var user = docs[0].value;
      console.log('user exists: ' + util.inspect(user));
      promise.fulfill(user);
    } else {
      var u = new Backbone.Model({
        accessToken: accessToken,
        accessTokenSecret: accessTokenSecret,
        username: twitterUserData.screen_name,
        name: twitterUserData.name,
	gravatar: twitterUserData.profile_image_url,
        twitterId: twitterUserData.id,
   	twitterUserData: twitterUserData
      });
      console.log(util.inspect(u));
      
      var doc = u.toJSON();
      c.database('users').save(doc, function(err, res) {
        if (err) {
          console.log("Error using users:");
          console.log(err);
          promise.fail(err);
          return;
        }
        console.log('user created: ' + util.inspect(doc));
        promise.fulfill(doc);
      });
    }
  });
};