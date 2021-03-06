/*~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
           ______     ______     ______   __  __     __     ______
          /\  == \   /\  __ \   /\__  _\ /\ \/ /    /\ \   /\__  _\
          \ \  __<   \ \ \/\ \  \/_/\ \/ \ \  _"-.  \ \ \  \/_/\ \/
           \ \_____\  \ \_____\    \ \_\  \ \_\ \_\  \ \_\    \ \_\
            \/_____/   \/_____/     \/_/   \/_/\/_/   \/_/     \/_/


This is a sample Facebook bot built with Botkit.

This bot demonstrates many of the core features of Botkit:

* Connect to Facebook's Messenger APIs
* Receive messages based on "spoken" patterns
* Reply to messages
* Use the conversation system to ask questions
* Use the built in storage system to store and retrieve information
  for a user.

# RUN THE BOT:

  Follow the instructions here to set up your Facebook app and page:

    -> https://developers.facebook.com/docs/messenger-platform/implementation

  Run your bot from the command line:

    page_token=<MY PAGE TOKEN> verify_token=<MY_VERIFY_TOKEN> node facebook_bot.js [--lt [--ltsubdomain LOCALTUNNEL_SUBDOMAIN]]

  Use the --lt option to make your bot available on the web through localtunnel.me.

# USE THE BOT:

  Find your bot inside Facebook to send it a direct message.

  Say: "Hello"

  The bot will reply "Hello!"

  Say: "who are you?"

  The bot will tell you its name, where it running, and for how long.

  Say: "Call me <nickname>"

  Tell the bot your nickname. Now you are friends.

  Say: "who am I?"

  The bot will tell you your nickname, if it knows one for you.

  Say: "shutdown"

  The bot will ask if you are sure, and then shut itself down.

  Make sure to invite your bot into other channels using /invite @<my bot>!

# EXTEND THE BOT:

  Botkit has many features for building cool and useful bots!

  Read all about it here:

    -> http://howdy.ai/botkit

~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/


if (!process.env.FACEBOOK_PAGE_ACCESS_TOKEN) {
    console.log('Error: Specify page_token in environment');
    process.exit(1);
}

if (!process.env.FACEBOOK_VERIFY_TOKEN) {
    console.log('Error: Specify verify_token in environment');
    process.exit(1);
}

var Botkit = require('./lib/Botkit.js');
var os = require('os');
var commandLineArgs = require('command-line-args');
var localtunnel = require('localtunnel');
var fetch = require('node-fetch');

const cli = commandLineArgs([
      {name: 'lt', alias: 'l', args: 1, description: 'Use localtunnel.me to make your bot available on the web.',
      type: Boolean, defaultValue: false},
      {name: 'ltsubdomain', alias: 's', args: 1,
      description: 'Custom subdomain for the localtunnel.me URL. This option can only be used together with --lt.',
      type: String, defaultValue: null},
   ]);

const ops = cli.parse();
if(ops.lt === false && ops.ltsubdomain !== null) {
    console.log("error: --ltsubdomain can only be used together with --lt.");
    process.exit();
}

var controller = Botkit.facebookbot({
    debug: true,
    access_token: process.env.FACEBOOK_PAGE_ACCESS_TOKEN,
    verify_token: process.env.FACEBOOK_VERIFY_TOKEN,
});

var bot = controller.spawn({
});

controller.setupWebserver(process.env.PORT || 3000, function(err, webserver) {
    controller.createWebhookEndpoints(webserver, bot, function() {
        console.log('ONLINE!');
        if(ops.lt) {
            var tunnel = localtunnel(process.env.PORT || 3000, {subdomain: ops.ltsubdomain}, function(err, tunnel) {
                if (err) {
                    console.log(err);
                    process.exit();
                }
                console.log("Your bot is available on the web at the following URL: " + tunnel.url + '/facebook/receive');
            });

            tunnel.on('close', function() {
                console.log("Your bot is no longer available on the web at the localtunnnel.me URL.");
                process.exit();
            });
        }
    });
});

controller.hears(['in space'], 'message_received', (bot, message) => {
  bot.startConversation(message, function(err, convo) {
    convo.ask({
      attachment: {
        'type': 'template',
        'payload': {
          'template_type': 'button',
          'text': 'What do you want to know?',
          'buttons': [
            {
              'type': 'postback',
              'title': 'Who’s in space?',
              'payload': 'whosInSpace'
            },
            {
              'type': 'postback',
              'title': 'Where’s the ISS?',
              'payload': 'whereIsISS'
            }
          ]
        }
      }
    }, function(response, convo) {
        // whoa, I got the postback payload as a response to my convo.ask!
        console.log('PAYLOAD', response.text);
        // convo.next();
    });
  });
});

controller.on('facebook_postback', function(bot, message) {
  console.log('PAYLOAD', message.payload);
  if (message.payload === 'whosInSpace') {
    fetch('http://api.open-notify.org/astros.json').
    then((response) => {
      console.log('RESPONSE', response);
      return response.json();
    }).
    then((json) => {
      var astroCount = json['number'];
      var listNames = [];
      for (var name of json['people']) {
        listNames.push(name['name']);
      }
      listNames = listNames.join(', ');
      // console.log('NEW PEOPLE', listNames);
      // console.log('AWAKE?', json, bot);
      bot.reply(message, `There are ${astroCount} people in space right now: ${listNames}.`);
    });
  } else if (message.payload === 'whereIsISS') {
    fetch('http://api.open-notify.org/iss-now.json')
    .then((response) => {
      return response.json();
    })
    .then((json) => {
      var issLat = json['iss_position'].latitude;
      var issLon = json['iss_position'].longitude;
      var mapURL = `http://maps.googleapis.com/maps/api/staticmap?center=${issLat},${issLon}&zoom=3&size=600x300&maptype=roadmap&markers=color:orange%7Clabel:A%7C${issLat},${issLon}&sensor=false`;
      var attachment = {
        'type': 'image',
        'payload': {
          'url': mapURL
        }
      }
      bot.reply(message, 'The ISS is here:');
      bot.reply(message, {
        attachment: attachment
      });
    });
  }
});



// controller.hears(['hello', 'hi'], 'message_received', function(bot, message) {
//     controller.storage.users.get(message.user, function(err, user) {
//         if (user && user.name) {
//             bot.reply(message, 'Hello ' + user.name + '!!');
//         } else {
//             bot.reply(message, 'Hello.');
//         }
//     });
// });
//
//
// controller.hears(['structured'], 'message_received', function(bot, message) {
//
//     bot.startConversation(message, function(err, convo) {
//         convo.ask({
//             attachment: {
//                 'type': 'template',
//                 'payload': {
//                     'template_type': 'generic',
//                     'elements': [
//                         {
//                             'title': 'Classic White T-Shirt',
//                             'image_url': 'http://petersapparel.parseapp.com/img/item100-thumb.png',
//                             'subtitle': 'Soft white cotton t-shirt is back in style',
//                             'buttons': [
//                                 {
//                                     'type': 'web_url',
//                                     'url': 'https://petersapparel.parseapp.com/view_item?item_id=100',
//                                     'title': 'View Item'
//                                 },
//                                 {
//                                     'type': 'web_url',
//                                     'url': 'https://petersapparel.parseapp.com/buy_item?item_id=100',
//                                     'title': 'Buy Item'
//                                 },
//                                 {
//                                     'type': 'postback',
//                                     'title': 'Bookmark Item',
//                                     'payload': 'White T-Shirt'
//                                 }
//                             ]
//                         },
//                         {
//                             'title': 'Classic Grey T-Shirt',
//                             'image_url': 'http://petersapparel.parseapp.com/img/item101-thumb.png',
//                             'subtitle': 'Soft gray cotton t-shirt is back in style',
//                             'buttons': [
//                                 {
//                                     'type': 'web_url',
//                                     'url': 'https://petersapparel.parseapp.com/view_item?item_id=101',
//                                     'title': 'View Item'
//                                 },
//                                 {
//                                     'type': 'web_url',
//                                     'url': 'https://petersapparel.parseapp.com/buy_item?item_id=101',
//                                     'title': 'Buy Item'
//                                 },
//                                 {
//                                     'type': 'postback',
//                                     'title': 'Bookmark Item',
//                                     'payload': 'Grey T-Shirt'
//                                 }
//                             ]
//                         }
//                     ]
//                 }
//             }
//         }, function(response, convo) {
//             // whoa, I got the postback payload as a response to my convo.ask!
//             convo.next();
//         });
//     });
// });
//
// // controller.on('facebook_postback', function(bot, message) {
// //
// //     bot.reply(message, 'Great Choice!!!! (' + message.payload + ')');
// //
// // });
//
//
// controller.hears(['call me (.*)', 'my name is (.*)'], 'message_received', function(bot, message) {
//     var name = message.match[1];
//     controller.storage.users.get(message.user, function(err, user) {
//         if (!user) {
//             user = {
//                 id: message.user,
//             };
//         }
//         user.name = name;
//         controller.storage.users.save(user, function(err, id) {
//             bot.reply(message, 'Got it. I will call you ' + user.name + ' from now on.');
//         });
//     });
// });
//
// controller.hears(['what is my name', 'who am i'], 'message_received', function(bot, message) {
//     controller.storage.users.get(message.user, function(err, user) {
//         if (user && user.name) {
//             bot.reply(message, 'Your name is ' + user.name);
//         } else {
//             bot.startConversation(message, function(err, convo) {
//                 if (!err) {
//                     convo.say('I do not know your name yet!');
//                     convo.ask('What should I call you?', function(response, convo) {
//                         convo.ask('You want me to call you `' + response.text + '`?', [
//                             {
//                                 pattern: 'yes',
//                                 callback: function(response, convo) {
//                                     // since no further messages are queued after this,
//                                     // the conversation will end naturally with status == 'completed'
//                                     convo.next();
//                                 }
//                             },
//                             {
//                                 pattern: 'no',
//                                 callback: function(response, convo) {
//                                     // stop the conversation. this will cause it to end with status == 'stopped'
//                                     convo.stop();
//                                 }
//                             },
//                             {
//                                 default: true,
//                                 callback: function(response, convo) {
//                                     convo.repeat();
//                                     convo.next();
//                                 }
//                             }
//                         ]);
//
//                         convo.next();
//
//                     }, {'key': 'nickname'}); // store the results in a field called nickname
//
//                     convo.on('end', function(convo) {
//                         if (convo.status == 'completed') {
//                             bot.reply(message, 'OK! I will update my dossier...');
//
//                             controller.storage.users.get(message.user, function(err, user) {
//                                 if (!user) {
//                                     user = {
//                                         id: message.user,
//                                     };
//                                 }
//                                 user.name = convo.extractResponse('nickname');
//                                 controller.storage.users.save(user, function(err, id) {
//                                     bot.reply(message, 'Got it. I will call you ' + user.name + ' from now on.');
//                                 });
//                             });
//
//
//
//                         } else {
//                             // this happens if the conversation ended prematurely for some reason
//                             bot.reply(message, 'OK, nevermind!');
//                         }
//                     });
//                 }
//             });
//         }
//     });
// });
//
// controller.hears(['shutdown'], 'message_received', function(bot, message) {
//
//     bot.startConversation(message, function(err, convo) {
//
//         convo.ask('Are you sure you want me to shutdown?', [
//             {
//                 pattern: bot.utterances.yes,
//                 callback: function(response, convo) {
//                     convo.say('Bye!');
//                     convo.next();
//                     setTimeout(function() {
//                         process.exit();
//                     }, 3000);
//                 }
//             },
//         {
//             pattern: bot.utterances.no,
//             default: true,
//             callback: function(response, convo) {
//                 convo.say('*Phew!*');
//                 convo.next();
//             }
//         }
//         ]);
//     });
// });
//
//
// controller.hears(['uptime', 'identify yourself', 'who are you', 'what is your name'], 'message_received',
//     function(bot, message) {
//
//         var hostname = os.hostname();
//         var uptime = formatUptime(process.uptime());
//
//         bot.reply(message,
//             ':|] I am a bot. I have been running for ' + uptime + ' on ' + hostname + '.');
//     });
//
//
//
// controller.on('message_received', function(bot, message) {
//     bot.reply(message, 'Try: `what is my name` or `structured` or `call me captain`');
//     return false;
// });
//
//
// function formatUptime(uptime) {
//     var unit = 'second';
//     if (uptime > 60) {
//         uptime = uptime / 60;
//         unit = 'minute';
//     }
//     if (uptime > 60) {
//         uptime = uptime / 60;
//         unit = 'hour';
//     }
//     if (uptime != 1) {
//         unit = unit + 's';
//     }
//
//     uptime = uptime + ' ' + unit;
//     return uptime;
// }
