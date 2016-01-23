var Botkit = require('botkit'),
    controller = Botkit.slackbot(),
    request = require('request');

controller.configureSlackApp({
  clientId: process.env.SLACK_CLIENT_ID,
  clientSecret: process.env.SLACK_CLIENT_SECRET,
  scopes: ['commands']
});

controller.setupWebserver(process.env.PORT, function(err, webserver) {

  console.log("Starting Slack Reddit at ", process.env.PORT);

  webserver.get('/',function(req,res) {
    res.send("Slack Reddit!");
  });

  webserver.post('/', function(req, res) {

    res.json({
      response_type: "in_channel",
      text: `Requesting post ${req.body.text} from Reddit's servers. Hang tight.`
    });

    request(`http://www.reddit.com/comments/${req.body.text}.json?limit=1&sort=top`, function (error, response, body) {
      if (!error && response.statusCode == 200) {

        var json = JSON.parse(body),
            post = json[0].data.children[0].data,
            top_comment = json[1].data.children[0].data;

        var isUrlAnImage = ['gifv', 'gif', 'png', 'jpg', 'jpeg', 'bmp'].some(function(ext) {
          return post.url.toLowerCase().endsWith(ext);
        });

        var imageUrl = post.url.toLowerCase().endsWith('.gifv') ? post.url.slice(0, -1) : post.url;

        var main_attachment = {
          title: post.title,
          color: "#000000"
        };

        if (isUrlAnImage) {
          main_attachment.image_url = imageUrl;
          main_attachment.title_link = post.url;
        } else {
          main_attachment.text = post.url;
        }

        var comment_attachment = {
          pretext: `Top comment:`,
          title: `${top_comment.body}`,
          text: `<https://reddit.com${post.permalink}|View all comments>`,
          mrkdwn_in: ["text"],
          color: "#eeeeee"
        };

        request({
          method: 'POST',
          uri: req.body.response_url,
          json: {
            response_type: "in_channel",
            attachments: [ main_attachment, comment_attachment ]
          }
        },
        function (error, response, body) {
          if (error) {
            return console.error('Response sent failed:', error);
          }
          console.log('Response sent to channel successfully.');
        });

      }
    })


  });

  controller.createOauthEndpoints(controller.webserver, function(err,req,res) {
    if (err) {
      res.status(500).send('ERROR: ' + err);
    } else {
      res.send('Success!');
    }
  });

});
