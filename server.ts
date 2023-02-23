const express = require('express');
const { google } = require('googleapis');
const cors = require("cors");

const app = express();
const port = 5000;

//Allows communication among the same server: Might cause security issues later
app.use(
  cors({
    origin: "http://localhost:3000",
  })
)

// Service Account Key and information. Make sure to change to environment variables later
const SCOPES = 'https://www.googleapis.com/auth/calendar.readonly';
const GOOGLE_PRIVATE_KEY= ""
const GOOGLE_CLIENT_EMAIL = ""
const GOOGLE_PROJECT_NUMBER = ""
const GOOGLE_CALENDAR_ID = ""

app.get('/', (req, res) => {
  // Create a JSON web token for authentification
  const jwtClient = new google.auth.JWT(
    GOOGLE_CLIENT_EMAIL,
    null,
    GOOGLE_PRIVATE_KEY,
    SCOPES
  );

  const calendar = google.calendar({
    version: 'v3',
    project: GOOGLE_PROJECT_NUMBER,
    auth: jwtClient
  });

  calendar.events.list({
    // Reference for Request Header: https://developers.google.com/calendar/api/v3/reference/events/list
    calendarId: GOOGLE_CALENDAR_ID,
    timeMin: (new Date()).toISOString(),
    //maxResults: 10,  Add this code if a limit of results is desired, Default:250
    singleEvents: true,
    orderBy: 'startTime',
  }, (error, result) => {
    if (error) {
      res.send(JSON.stringify({ error: error }));
    } else {
      if (result.data.items.length) {
        //Data Pre-Processing

        //REGEX for String parsing
        const roomLocation = /(?<=Location:)(.*?)(?=<br>)/gi
        const hosts = /(?<=<br>).*?(?=<br>)/
        const trueDescription = /([^>]*)$/

        const eventArray = new Array()

        for (const event of result.data.items) {
          // Create a new array with each event as an object
          const eventEntry = new Object()

          //Title, Date and Location
          eventEntry['title'] = event["summary"]
          eventEntry['datetime'] = new Object()
          eventEntry['location'] = new Object()

          //Time
          eventEntry['datetime']['date'] = new Date(event["start"]["dateTime"]).toLocaleDateString()
          eventEntry['datetime']['startTime'] = new Date(event["start"]["dateTime"]).toLocaleTimeString()
          eventEntry['datetime']['endTime'] = new Date(event["end"]["dateTime"]).toLocaleTimeString()

          //Adds the address if it is given. Else adds a blank string
          if (event.hasOwnProperty("location")) {
            eventEntry["location"]['mapsLocation'] = event["location"].trim()

          } else {
            eventEntry["location"]['mapsLocation'] = ""
          }

          //Uses REGEX to add more fields
          eventEntry["location"]['roomLocation'] = event["description"].match(roomLocation)[0].replace(/<b>/g, '').replace(/<\/b>/g, '').trim()
          eventEntry['registerFormURL'] = ""
          eventEntry['description'] = event["description"].match(trueDescription)[0].trim()
          eventEntry['presenters'] = event["description"].match(hosts)[0].replace(/<b>/g, '').replace(/<\/b>/g, '').trim()


          eventArray.push(eventEntry)
        }
        //Creates a JSON string for get requests
        res.send(JSON.stringify({events: eventArray}));
      } else {
        res.send(JSON.stringify({ message: 'No upcoming events found.' }));
      }
    }
  });
});

app.listen(port, () => console.log(`Server is listening on port ${port}!`));
