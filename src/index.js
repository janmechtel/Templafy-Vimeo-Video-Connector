import express from 'express';
import path from 'path';
import JsZip from 'jszip';
import fs from 'fs'
import { resolve } from 'path';
const __dirname = path.resolve();

var app = express();

var PORT = process.env.PORT || 3000;

app.post('/oauth/token', function (req, res) {
    const response = {
        access_token: "no-auth"
    }

    res.send(response);
});

app.get('/download', function (req, res) {

    // use the videoUrl parameter from the request
    // const videoUrl = req.query.videoUrl;
    
    var originalFolder = './assets/Video2';
    var sourceFolder = './assets/Video2-copy-' + new Date().getTime();
    copyFolder(originalFolder, sourceFolder);
    
    replaceStringInFile(
        resolve(sourceFolder, 'ppt/slides/_rels/slide1.xml.rels'),
        'Target="https://player.vimeo.com/video/651772687?h=71334ad1a6&amp;app_id=122963"',
        'Target="https://player.vimeo.com/video/651772687?h=71334ad1a6&amp;app_id=122963"',
        // 'Target="https://player.vimeo.com/video/696472656?h=5ec3756bb5&amp;app_id=122963"',
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

app.get('/content/:contentId/download-url', function (req, res) {
    const url = { downloadUrl: req.protocol + '://' + req.get('host') + `/download` };
    res.send(url);
});

app.get('/content/', async function (req, res) {

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
    fs.writeFile(outputFile, zipContent,function(err, result) {
        if(err) console.log('error', err);
    });
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