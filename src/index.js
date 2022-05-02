import express from 'express';
import path from 'path';
import JsZip from 'jszip';
import fs from 'fs'
import { resolve } from 'path';

import {Vimeo} from 'vimeo'; 

const clientId = process.env.VIMEO_CLIENT_ID;
const clientSecret = process.env.VIMEO_CLIENT_SECRET;
const accessToken = process.env.VIMEO_ACCESS_TOKEN;

const __dirname = path.resolve();

var app = express();

var PORT = process.env.PORT || 3000;

app.post('/oauth/token', function (req, res) {
    const response = {
        access_token: "no-auth"
    }

    res.send(response);
});

app.get('/download/*', function (req, res) {

    //TODO: clean out the video files
    //TODO: update the preview picture image1.jpeg by accepting a second parameter = the previewUrl

    //working with the original url because of a bug in the azure load balancer, 
    // which seems to unescape the url before it reaches the express router
    // https://github.com/Azure/iisnode/issues/104
    // https://github.com/tjanczuk/iisnode/issues/217

    // remove '/download/' from the url
    console.log(req.originalUrl);
    const videoUrl = decodeURIComponent(req.originalUrl).replace('/download/','');
    console.log(videoUrl);
    
    var originalFolder = './assets/Video2';
    var sourceFolder = './assets/Video2-copy-' + new Date().getTime();
    copyFolder(originalFolder, sourceFolder);
    replaceStringInFile(
        resolve(sourceFolder, 'ppt/slides/_rels/slide1.xml.rels'),
        'Target="https://player.vimeo.com/video/651772687?h=71334ad1a6&amp;app_id=122963"',
        'Target="' + videoUrl + '&amp;app_id=122963"',
        );

    var pptxFile = `./download-${new Date().getTime()}.pptx`;
    
    createZipFile(sourceFolder,pptxFile).then(() => {
        res.download(pptxFile, function(err) {
            // delete the file
            fs.unlink(pptxFile, function(err) {
                if (err) {
                    console.log(err);
                }
            });

            if(err) {
                console.log(err);
            }
        });

        deleteFolderRecursive(sourceFolder);
    });
    
    //TODO: change to write the stream instead of saving the file

    // var file = fs.readFileSync(__dirname + '/assets/Video.pptx', 'binary');

    // res.setHeader('Content-Length', file.length);
    // res.write(file, 'binary');
    // res.end();
});

app.get('/content/', async function (req, res) {

    const response = {
        contentCount: 0,
        offset: 0,
        content: []
    }

    if (req.query.contentType != "slideElement") {
        res.statusCode = 406;
        res.send("Content type not supported (only 'slideElement' is supported).");
        return;
    }


    if (req.query.pageNumber > 1) {
        res.send(response);
        return;
    }

    try {
        const query = req.query.search;
        
        let client = new Vimeo(clientId, clientSecret, accessToken);
        
        client.request({
            method: 'GET',
            path: '/videos',
            query: {
                query: query
            }

        }, function (error, body, status_code, headers) {
            if (error) {
                console.log(error);
            }
            
            // console.log(body);
            if (status_code === 200) {
                //iterate through the videos in body.data
                body.data.forEach(function(video) {
                    console.log(video);
                    response.content.push({
                        id: encodeURIComponent(video.player_embed_url),
                        mimeType: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
                        previewUrl: video.pictures.base_link, 
                        // `https://i.vimeocdn.com/video/1410789380-ce6e905b04fe6a6aabc9bf2a136bac550b869af6a336fe5f10d9818256992742-d?mw=1200&mh=675&q=70`,
                        name: video.name,
                        tags: "" // video.tags
                    })
                    response.contentCount = response.contentCount+1;
                });
            }
            // response.body = body;
            res.send(response);            
        })

    } catch (error) {
        console.log(error);
        res.send(response)
    }
    
});

app.get('/content/*', function (req, res) {
    try {
        //working with the original url because of a bug in the azure load balancer, 
        // which seems to unescape the url before it reaches the express router
        // https://github.com/Azure/iisnode/issues/104
        // https://github.com/tjanczuk/iisnode/issues/217

        // remove '/download-url' from the url
        console.log(req.originalUrl);
        var videoUrl = decodeURIComponent(req.originalUrl.replace('/content/','').replace('/download-url', ''));
        console.log(videoUrl);
        const body = { downloadUrl:  'https://' + req.get('host') + `/download/${encodeURIComponent(videoUrl)}` };
        res.send(body);
        console.log(body);
    } catch (error) {
        console.log(error);
    }
});

app.get('/', function (req, res) {
    res.sendStatus(200);
});

app.listen(PORT, function () {
    console.log('Server is running on PORT:', PORT);
});


/** create zip file for extension */
async function createZipFile(sourceFolder, outputFile) {
    
    console.log(outputFile);
    var rootDirectory = process.cwd();
    // we know what directory we want
    const sourceDir = resolve(rootDirectory, sourceFolder);
    
    let zip = new JsZip();
    buildZipFromDirectory(sourceDir, zip, sourceDir);
    
    /** generate zip file content */
    const zipContent = await zip.generateAsync({
        type: 'nodebuffer',
        comment: '',
        compression: "DEFLATE",
        compressionOptions: {
            level: 9
        }
    });
    /** create zip file */
    return fs.writeFileSync(outputFile, zipContent);
}

// returns a flat array of absolute paths of all files recursively contained in the dir
function buildZipFromDirectory(dir, zip, root) {
    const list = fs.readdirSync(dir);

    for (let file of list) {
        file = path.resolve(dir, file)
        let stat = fs.statSync(file)
        if (stat && stat.isDirectory()) {
            buildZipFromDirectory(file, zip, root)
        } else {
            const filedata = fs.readFileSync(file);
            zip.file(path.relative(root, file), filedata);
        }
    }
}

//open a text file, replace a string and save it to a new file
function replaceStringInFile(filePath, stringToReplace, replaceWith) {
    // We assume it's UTF-8
    var fileContent = fs.readFileSync(filePath, 'utf8');
    var newFileContent = fileContent.replace(stringToReplace, replaceWith);
    fs.writeFileSync(filePath, newFileContent);
}

function createFolder(path) {
    try {
        fs.mkdirSync(path);
    } catch (e) {
        if (e.code != 'EEXIST') {
            throw e;
        }
    }
}

// copy folder to temporary folder and delete it afterwards
function copyFolder(source, target) {
    createFolder(target);
    var files = [];
    //check if folder exists
    if (fs.existsSync(source)) {
        //copy
        var files = fs.readdirSync(source);
        files.forEach(function (file) {
            var curSource = path.join(source, file);
            var curTarget = path.join(target, file);
            if (fs.lstatSync(curSource).isDirectory()) {
                copyFolder(curSource, curTarget);
            } else {
                fs.copyFileSync(curSource, curTarget);
            }
        });
    }
}


// delete folder Recursive
function deleteFolderRecursive(path) {
    if (fs.existsSync(path)) {
        fs.readdirSync(path).forEach(function (file, index) {
            var curPath = path + "/" + file;
            if (fs.lstatSync(curPath).isDirectory()) { // recurse
                deleteFolderRecursive(curPath);
            } else { // delete file
                fs.unlinkSync(curPath);
            }
        });
        fs.rmdirSync(path);
    }
}