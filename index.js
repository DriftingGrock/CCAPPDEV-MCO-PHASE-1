const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/MC3_Votes_persona');

const express = require('express');
const app = new express();

const Vote = require("./models/Vote");
const path = require('path'); 

app.use(express.json());
app.use(express.urlencoded( {extended: true})); 
app.use(express.static('public'));

var hbs = require('hbs');
app.set('view engine','hbs');

///////////////////////////////////////////////////////////////////////////////////////////////////////////////
//
// Edit at this point onwards
//
//////////////////////////////////////////////////////////////////////////////////////////////////////////////

var server = app.listen(3000, function () {
    console.log("CCAPDEV Mini Challenge #3: Persona 5, Dancing in Starlight!");
    console.log("Who is the best dancer at port 3000?");
    console.log(".");
});

app.get('/', function (req, res) {
    // TODO: Render index.html (10 pts.)
    app.use(express.static(path.join((__dirname), 'Codes')));
    res.sendFile(path.join(__dirname, '', 'index.html'));
});

app.get('/vote', function (req, res) {
    // TODO: Create an instance of a Vote document. Use the .create() method from the declared Vote object
    //const {q} = req.body;
    //console.log(req.body);
    //vote = Vote.create({
    //    q: q
    //});
    const voteVal = req.query.q;
    const newVote = Vote.create({
        q: voteVal
    });
    // TODO: Redirect to the confirm route (10 pts.)
    res.redirect('/confirm');
});

app.get('/confirm', function (req, res) {
    // TODO: Render confirm.html (10 pts.)
    app.use(express.static(path.join((__dirname), 'Codes')));
    res.sendFile(path.join(__dirname, '', 'confirm.html'));
});

app.get('/results', async (req, res) => {
    // TODO: Create a JSON object that contains the no. of votes for a particular member.
    // Ex: ren = no. of ren's votes, yusuke = no. of yusuke's votes, etc.
    // Variables are named for you so you don't have to memorize their names. :)

    // Step 1: Assign these variables with the correct values resulting from querying MongoDB using Mongoose
    var ren;
    var ryuji;
    var ann;
    var makoto;
    var yusuke;
    var futaba;
    var haru;
    var morgana;

    ren = await Vote.find({q: 'ren'});
    ryuji = await Vote.find({q: 'ryuji'});
    ann = await Vote.find({q: 'ann'});
    makoto = await Vote.find({q: 'makoto'});
    yusuke = await Vote.find({q: 'yusuke'});
    futaba = await Vote.find({q: 'futaba'});
    haru = await Vote.find({q: 'haru'});
    morgana = await Vote.find({q: 'morgana'});


    // TODO: Build the JSON object, and replace the values with the correct corresponding no. of votes
    // of that particular member.
    // HINT: length() can be used to determine the number of entries in a collection of documents obtained from a query
    var result = {};
     // TODO: Pass the values to be rendered into the 'results' handlebar.
    res.render('results', {
        results: {
            ren: ren.length,
            ryuji: ryuji.length,
            ann: ann.length,
            makoto: makoto.length,
            yusuke: yusuke.length,
            futaba: futaba.length,
            haru: haru.length,
            morgana: morgana.length
        }
    });
});