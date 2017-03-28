
var APP_ID = undefined;//replace with 'amzn1.echo-sdk-ams.app.[your-unique-value-here]'

var AlexaSkill = require('./AlexaSkill');

var CarServiceInfo = function () {
    AlexaSkill.call(this, APP_ID);
};

// Extend AlexaSkill
CarServiceInfo.prototype = Object.create(AlexaSkill.prototype);
CarServiceInfo.prototype.constructor = CarServiceInfo;

// ----------------------- Override AlexaSkill request and intent handlers -----------------------

CarServiceInfo.prototype.eventHandlers.onSessionStarted = function (sessionStartedRequest, session) {
    console.log("onSessionStarted requestId: " + sessionStartedRequest.requestId
        + ", sessionId: " + session.sessionId);
    // any initialization logic goes here
};

CarServiceInfo.prototype.eventHandlers.onLaunch = function (launchRequest, session, response) {
    console.log("onLaunch requestId: " + launchRequest.requestId + ", sessionId: " + session.sessionId);
    handleWelcomeRequest(response);
};

CarServiceInfo.prototype.eventHandlers.onSessionEnded = function (sessionEndedRequest, session) {
    console.log("onSessionEnded requestId: " + sessionEndedRequest.requestId
        + ", sessionId: " + session.sessionId);
    // any cleanup logic goes here
};

/**
 * override intentHandlers to map intent handling functions.
 */
CarServiceInfo.prototype.intentHandlers = {
    "CarServiceInfoIntent": function (intent, session, response) {
        handleCarServiceInfoRequest(intent, session, response);
    },

    "AMAZON.HelpIntent": function (intent, session, response) {
        handleHelpRequest(response);
    },

    "AMAZON.StopIntent": function (intent, session, response) {
        var speechOutput = "Goodbye";
        response.tell(speechOutput);
    },

    "AMAZON.CancelIntent": function (intent, session, response) {
        var speechOutput = "Goodbye";
        response.tell(speechOutput);
    }
};

function handleWelcomeRequest(response) {
    var whichNamePrompt = "Which person would you like service information for?",
        speechOutput = {
            speech: "<speak>Welcome to Mazda Car Service Information. "
                + whichNamePrompt
                + "</speak>",
            type: AlexaSkill.speechOutputType.SSML
        },
        repromptOutput = {
            speech: "I can lead you through providing a name "
                + "or you can simply open Mazda Car Service and ask a question like, "
                + "get service information for Jason. ",
            type: AlexaSkill.speechOutputType.PLAIN_TEXT
        };

    response.ask(speechOutput, repromptOutput);
}

function handleHelpRequest(response) {
    var repromptText = "Which name would you like service information for?";
    var speechOutput = "I can lead you through providing a name "
        + "or you can simply open Mazda Car Service and ask a question like, "
        + "get service information for Jason. "
        + "Or you can say exit. "
        + repromptText;

    response.ask(speechOutput, repromptText);
}

function handleCarServiceInfoRequest(intent, session, response) {

    var userName = getUserNameFromIntent(intent, true),
        repromptText,
        speechOutput;
    if (userName.error) {
        repromptText = "I don't know car service information for: " + userName.name
            + "Which name would you like service information for?";
        speechOutput = userName.name ? "I'm sorry, I don't have any data for " + userName.name + ". " + repromptText : repromptText;

        response.ask(speechOutput, repromptText);
        return;
    }

    getFinalServiceResponse(userName, response);
}

function getFinalServiceResponse(userName, response) {

    makeServiceRequest(userName.name, function carServiceResponseCallback(err, carServiceResponse) {
        var speechOutput;

        if (err) {
            speechOutput = "Sorry, I'm experiencing a problem. Please try again later";
        } else {
            speechOutput = userName.name + ", your Mazda is due for a service in " + carServiceResponse.miles + "miles, your last service was "
                + carServiceResponse.months + "months ago ";
        }

        response.tellWithCard(speechOutput, "MazdaCarService", speechOutput)
    });
}

function makeServiceRequest(name, carServiceResponseCallback) {
    
    var AWS = require("aws-sdk");

AWS.config.update({
  region: "us-east",
  endpoint: "arn:aws:dynamodb:us-east-1:646350141162:table/MazdaFleetUserData"
});

var docClient = new AWS.DynamoDB.DocumentClient();

console.log("Mazda Car Service Query.");

var params = {
    TableName : "MazdaFleetUserData",
    KeyConditionExpression: "name = :userName",
    ExpressionAttributeNames:{
        "name": "userName"
    },
    ExpressionAttributeValues: {
        ":name":userName
    }
};

docClient.query(params, function(err, data) {
    if (err) {
        console.error("Unable to query. Error:", JSON.stringify(err, null, 2));
    } else {
        console.log("Query succeeded.");
        data.Items.forEach(function(item) {
            console.log(" -", item.miles + ": " + item.months);
        });
    }
});

// Create the handler that responds to the Alexa Request.
exports.handler = function (event, context) {
    var carServiceInfo = new CarServiceInfo();
    carServiceInfo.execute(event, context);
};
