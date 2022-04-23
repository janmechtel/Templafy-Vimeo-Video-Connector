import express from 'express';
import fetch from 'node-fetch';

var app = express();

var PORT = process.env.PORT || 3000;

app.post('/oauth/token', function(req, res) {
    const response = {
        access_token: "no-auth"
    }

    res.send(response);
});

app.get('/content/:domain/download-url', function(req, res) {
    const url = { downloadUrl: `https://logo.clearbit.com/${req.params.domain}?size=800` };
    res.send(url);
});

app.get('/content/', async function(req, res) {
    
    if (req.query.contentType != "slideElement") {
        res.statusCode = 406;
        res.send("Content type not supported (only 'slideElement' is supported).");
        return;
    }

    const response = {
        contentCount: 0,
        offset: 0,
        content: []
    }

    if (req.query.pageNumber > 1) {
        res.send(response)
    }

    const searchQuery = req.query.search;
    response.content.push({
        id: searchQuery,
        mimeType: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        previewUrl: `https://i.vimeocdn.com/video/1410789380-ce6e905b04fe6a6aabc9bf2a136bac550b869af6a336fe5f10d9818256992742-d?mw=1200&mh=675&q=70`,
        name: `${searchQuery}`,
        tags: searchQuery
    })
    response.contentCount = 1;
    
    res.send(response);
});

app.get('/', function(req, res) {
    res.sendStatus(200);
});

app.listen(PORT, function() {
    console.log('Server is running on PORT:', PORT);
});