/* eslint-disable  func-names */
/* eslint-disable  no-console */

const Alexa = require('ask-sdk');
const axios = require('axios');
const indico = require('indico.io');
indico.apiKey = '25caaaee62e96d264085e8b71ed40889';

const LaunchRequestHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'LaunchRequest';
  },
  handle(handlerInput) {
    const speechText =
      'Hello, Welcome to soundsgood. I can help you find some good music that suits your mood. Please tell me how you feel today? You can say something like, I feel great, or I am not in a good mood';
    const repromptText =
      'You can say something like, I feel great, or I am not in a good mood';
    const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
    sessionAttributes.launched = true;
    handlerInput.attributesManager.setSessionAttributes(sessionAttributes);
    handlerInput.responseBuilder.withStandardCard(
      'Welcome to Sounds Good',
      'Help me find you some good music',
      'https://source.unsplash.com/300x300/?music'
    );

    return handlerInput.responseBuilder
      .speak(speechText)
      .reprompt(repromptText)
      .getResponse();
  }
};

const AnalyzeFeelingIntentHandler = {
  canHandle(handlerInput) {
    return (
      handlerInput.requestEnvelope.request.type === 'IntentRequest' &&
      handlerInput.requestEnvelope.request.intent.name ===
        'AnalyzeFeelingIntent'
    );
  },
  async handle(handlerInput) {
    const sentiment = await indico.sentiment(
      handlerInput.requestEnvelope.request.intent.slots.feeling.value
    );

    const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();

    let speechText;
    if (sentiment > 0.6) {
      // Should be directed to Genre or surprise me
      speechText =
        'Great. Sounds like you are in a good mood. Tell me, what type of music do you like to listen today? You can say something like, I like to listen to some Jazz, or I like country, or you can say, surprise me';
      sessionAttributes.mood = 'great';
      handlerInput.attributesManager.setSessionAttributes(sessionAttributes);
    } else {
      speechText =
        'Oh no...let me help you find something that will get you in a good mood. Please say <emphasis level="moderate">song</emphasis> <break time="300ms"/> if you want to find something similar to your favorite song, or say <emphasis level="moderate">genre</emphasis> <break time="300ms"/> if you want to find a specific type of music.';
      sessionAttributes.mood = 'bad';
      handlerInput.attributesManager.setSessionAttributes(sessionAttributes);
    }
    handlerInput.responseBuilder.withSimpleCard('Please Tell me your mood.');

    return handlerInput.responseBuilder
      .speak(speechText)
      .reprompt(speechText)
      .getResponse();
  }
};

const SongIntentHandler = {
  canHandle(handlerInput) {
    return (
      handlerInput.requestEnvelope.request.type === 'IntentRequest' &&
      handlerInput.requestEnvelope.request.intent.name === 'SongIntent'
    );
  },
  handle(handlerInput) {
    const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
    let speechText;
    if (handlerInput.requestEnvelope.request.intent.slots.song.value) {
      sessionAttributes.song =
        handlerInput.requestEnvelope.request.intent.slots.song.value;
      handlerInput.attributesManager.setSessionAttributes(sessionAttributes);
      const word = sessionAttributes.mood === 'bad' ? 'get music' : 'go ahead';
      speechText =
        'Great. Thanks for all the information. If you want me to go ahead and find you some music, please say <break time="200ms"/>' +
        word;
    } else {
      speechText =
        'Okay. Tell me the name of the song you are looking for. You can say something like I want to listen to close to me, or, I want something like lemonade';
    }
    return handlerInput.responseBuilder
      .speak(speechText)
      .reprompt(speechText)
      .getResponse();
  }
};

const GenreIntentHandler = {
  canHandle(handlerInput) {
    return (
      handlerInput.requestEnvelope.request.type === 'IntentRequest' &&
      handlerInput.requestEnvelope.request.intent.name === 'GenreIntent'
    );
  },
  handle(handlerInput) {
    const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
    let speechText;
    if (handlerInput.requestEnvelope.request.intent.slots.genre.value) {
      sessionAttributes.genre =
        handlerInput.requestEnvelope.request.intent.slots.genre.value;
      handlerInput.attributesManager.setSessionAttributes(sessionAttributes);
      speechText =
        'Great. Thanks for all the information. If you want me to go ahead and find you some music, please say <break time="200ms"/> get music.';
    } else {
      speechText =
        'Okay. Tell me the name of the genre you are looking for. You can say something like, I like rock music, or, I like to listen to classic.';
    }

    return handlerInput.responseBuilder
      .speak(speechText)
      .reprompt(speechText)
      .getResponse();
  }
};

const SurpriseMeIntentHandler = {
  canHandle(handlerInput) {
    return (
      handlerInput.requestEnvelope.request.type === 'IntentRequest' &&
      handlerInput.requestEnvelope.request.intent.name === 'SurpriseMeIntent'
    );
  },
  handle(handlerInput) {
    let speechText =
      'Awesome. I\'ll do my best to find you something you like. If you want me to go ahead and find you some music, please say <break time="200ms"/> go ahead.';
    return handlerInput.responseBuilder
      .speak(speechText)
      .reprompt(speechText)
      .getResponse();
  }
};

//if mood is bad -- we gonna use spotify recommendation endpoint target valence 0.7 or up
// either use seed track or seed genre
// in case of track -- we gonna need to first get track id with the search and grab it

//if mood is good -- we gonna search based on genre given search param would be genre
//if surprise me -- randomize search params?

const FetchMusicIntentHandler = {
  canHandle(handlerInput) {
    return (
      handlerInput.requestEnvelope.request.type === 'IntentRequest' &&
      handlerInput.requestEnvelope.request.intent.name === 'FetchMusicIntent'
    );
  },
  async handle(handlerInput) {
    const accessToken =
      handlerInput.requestEnvelope.context.System.user.accessToken;
    const authHeader = { headers: { Authorization: `Bearer ${accessToken}` } };
    const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
    const { mood, song, genre } = sessionAttributes;

    let result;

    if (mood === 'great') {
      if (genre) {
        const { data } = await axios.get(
          `https://api.spotify.com/v1/search?q=${genre} genre:"${genre}"&type=track&market=US&limit=20&offset=5`,
          authHeader
        );
        result = data;
      } else {
        //will implement randomizing func later... not today I think
        const { data } = await axios.get(
          `https://api.spotify.com/v1/search?q=world year:1980-1990&type=track&limit=20&offset=10`,
          authHeader
        );
        result = data;
      }
    }
    result = result.tracks.items
      .map(item => {
        const { id, name, preview_url, uri } = item;
        let artistName = item.artists[0].name;
        return { id, name, preview_url, uri, artistName };
      })
      .filter(el => el.preview_url !== null);

    sessionAttributes.data = result;
    handlerInput.attributesManager.setSessionAttributes(sessionAttributes);

    let speechText =
      'Great news! I got some great music for you. If you want to check them out, say play music';

    return handlerInput.responseBuilder
      .speak(speechText)
      .reprompt(speechText)
      .getResponse();
  }
};

const FetchMusicTwoIntentHandler = {
  canHandle(handlerInput) {
    return (
      handlerInput.requestEnvelope.request.type === 'IntentRequest' &&
      handlerInput.requestEnvelope.request.intent.name === 'FetchMusicTwoIntent'
    );
  },
  async handle(handlerInput) {
    const accessToken =
      handlerInput.requestEnvelope.context.System.user.accessToken;
    const authHeader = { headers: { Authorization: `Bearer ${accessToken}` } };
    const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
    const { song, genre } = sessionAttributes;

    let result;
    if (genre) {
      const { data } = await axios.get(
        `https://api.spotify.com/v1/recommendations?limit=20&market=US&seed_genres=${genre}&target_valence=0.8`,
        authHeader
      );
      result = data;
    } else if (song) {
      const { data } = await axios.get(
        `https://api.spotify.com/v1/search?q=${song}&type=track&market=US&limit=1`,
        authHeader
      );
      const trackId = data.tracks.items[0].id;
      const res = await axios.get(
        `https://api.spotify.com/v1/recommendations?limit=20&market=US&seed_tracks=${trackId}&target_valence=0.8`,
        authHeader
      );
      result = res.data;
    }
    result = result.tracks
      .map(item => {
        const { id, name, preview_url, uri } = item;
        let artistName = item.artists[0].name;
        return { id, name, preview_url, uri, artistName };
      })
      .filter(el => el.preview_url !== null);

    sessionAttributes.data = result;
    handlerInput.attributesManager.setSessionAttributes(sessionAttributes);

    let speechText =
      'Great news! I got some great music for you. If you want to check them out, say play music';

    return handlerInput.responseBuilder
      .speak(speechText)
      .reprompt(speechText)
      .getResponse();
  }
};

const PlayStreamIntentHandler = {
  canHandle(handlerInput) {
    return (
      handlerInput.requestEnvelope.request.type === 'IntentRequest' &&
      handlerInput.requestEnvelope.request.intent.name === 'PlayStreamIntent'
    );
  },
  async handle(handlerInput) {
    const accessToken =
      handlerInput.requestEnvelope.context.System.user.accessToken;
    const authHeader = { headers: { Authorization: `Bearer ${accessToken}` } };
    const { data } = handlerInput.attributesManager.getSessionAttributes();
    const uris = data.map(item => item.uri).slice(0, 5);
    const res = await axios.get('https://api.spotify.com/v1/me', authHeader);
    const userId = res.data.id;
    const response = await axios.post(
      `https://api.spotify.com/v1/users/${userId}/playlists`,
      {
        name: 'New Playlist' + new Date().toISOString(),
        description: 'My Awesome Playlist',
        public: false
      },
      authHeader
    );

    const plistId = response.data.id;
    await axios.post(
      `https://api.spotify.com/v1/playlists/${plistId}/tracks`,
      {
        uris
      },
      authHeader
    );

    handlerInput.responseBuilder
      .speak(
        'Hope you like the music that I got for you. Also I have created a new playlist with the result. Enjoy!'
      )
      .addAudioPlayerPlayDirective(
        'REPLACE_ALL',
        data[Math.floor(Math.random() * 5)].preview_url,
        'token',
        0,
        null
      );

    return handlerInput.responseBuilder.getResponse();
  }
};

const QueueStreamIntentHandler = {
  canHandle(handlerInput) {
    return (
      handlerInput.requestEnvelope.request.type ===
      'AudioPlayer.PlaybackNearlyFinished'
    );
  },
  handle(handlerInput) {
    const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
    sessionAttributes.count = (sessionAttributes.count || 0) + 1;
    handlerInput.attributesManager.setSessionAttributes(sessionAttributes);
    if (sessionAttributes.count < 5) {
      handlerInput.responseBuilder.addAudioPlayerPlayDirective(
        'ENQUEUE',
        sessionAttributes.data[sessionAttributes.count].preview_url,
        'oogabooga',
        0,
        'token'
      );
    } else {
      handlerInput.responseBuilder.addAudioPlayerStopDirective();
    }
    handlerInput.responseBuilder.speak('this is working?');
    return handlerInput.responseBuilder.getResponse();
  }
};

const HelpIntentHandler = {
  canHandle(handlerInput) {
    return (
      handlerInput.requestEnvelope.request.type === 'IntentRequest' &&
      handlerInput.requestEnvelope.request.intent.name === 'AMAZON.HelpIntent'
    );
  },
  handle(handlerInput) {
    let speechText = 'You can say something like get soundsgood';

    return handlerInput.responseBuilder
      .speak(speechText)
      .reprompt(speechText)
      .getResponse();
  }
};

const CancelAndStopIntentHandler = {
  canHandle(handlerInput) {
    return (
      handlerInput.requestEnvelope.request.type === 'IntentRequest' &&
      (handlerInput.requestEnvelope.request.intent.name ===
        'AMAZON.CancelIntent' ||
        handlerInput.requestEnvelope.request.intent.name ===
          'AMAZON.StopIntent')
    );
  },
  handle(handlerInput) {
    return handlerInput.responseBuilder.speak('Goodbye!').getResponse();
  }
};

const SessionEndedRequestHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'SessionEndedRequest';
  },
  handle(handlerInput) {
    console.log(
      `Session ended with reason: ${
        handlerInput.requestEnvelope.request.reason
      }`
    );

    return handlerInput.responseBuilder.getResponse();
  }
};

const ErrorHandler = {
  canHandle() {
    return true;
  },
  handle(handlerInput, error) {
    console.log(`Error handled: ${error.message}`);

    return handlerInput.responseBuilder
      .speak("Sorry, I can't understand the command. Please say again.")
      .reprompt("Sorry, I can't understand the command. Please say again.")
      .getResponse();
  }
};

const skillBuilder = Alexa.SkillBuilders.standard();

exports.handler = skillBuilder
  .addRequestHandlers(
    LaunchRequestHandler,
    AnalyzeFeelingIntentHandler,
    SongIntentHandler,
    GenreIntentHandler,
    SurpriseMeIntentHandler,
    FetchMusicIntentHandler,
    FetchMusicTwoIntentHandler,
    PlayStreamIntentHandler,
    HelpIntentHandler,
    CancelAndStopIntentHandler,
    SessionEndedRequestHandler,
    QueueStreamIntentHandler
  )
  .addErrorHandlers(ErrorHandler)
  .withTableName('alexa-data')
  .withAutoCreateTable(true)
  .lambda();
