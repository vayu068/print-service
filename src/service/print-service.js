const uuidv1 = require('uuid/v1'),
    request = require('request'),
    puppeteer = require('puppeteer'),
    azure = require('azure-storage'),
    path = require('path'),
config = require('../envVariables')


class PrintService {
    constructor(config) {
        (async() => {
            try {
              this.config = config;
              this.pdfBasePath = '/tmp/'
              this.browser = await puppeteer.launch({
                  executablePath: 'google-chrome-unstable',
                  args: ['--disable-dev-shm-usage', '--no-sandbox', '--disable-setuid-sandbox']
                });
              this.blobService = azure.createBlobService(this.config.azureAccountName, this.config.azureAccountKey);
            } catch(e) {
                console.error(e);
            }
            
        })();
    }

    generate(req, res) {
        (async () => {
            const url = req.query.fileUrl || '';
            const page = await this.browser.newPage();
            await page.goto(url);
            const pdfFilePath = this.pdfBasePath + uuidv1() +'.pdf'
            await page.pdf({path: pdfFilePath, format: 'A4'});
            page.close()
            const printService = this;
            const destPath = 'print-service/' + path.basename(pdfFilePath);
            this.blobService.createBlockBlobFromLocalFile('sunbird-content-dev', destPath, pdfFilePath, function(error, result, response) {
                if (!error) {
                  const pdfUrl = 'https://' + printService.config.azureAccountName + '.blob.core.windows.net/' + 'sunbird-content-dev/' + destPath;
                  printService.sendSuccess(res, { id: 'api.print.preview.generate' }, { pdfUrl: pdfUrl });
                } else {
                    console.error("Error: ", JSON.stringify(error));
                  printService.sendError(res, { id: 'api.print.preview.generate' });   
                }
              })
          })();
    }

    health(req, res) {
        this.sendSuccess(res, { id: 'api.health' });
    }

    sendError(res, options) {
        const resObj = {
            id: options.id,
            ver: options.ver || '1.0',
            ets: new Date().getTime(),
            params: options.params || {},
            responseCode: options.responseCode || 'SERVER_ERROR'
        }
        res.status(500);
        res.json(resObj);
    }

    sendSuccess(res, options, result = {}) {
        const resObj = {
            id: options.id,
            ver: options.ver || '1.0',
            ets: new Date().getTime(),
            params: options.params || {},
            responseCode: options.responseCode || 'SUCCESS',
            result: result
        }
        res.status(200);
        res.json(resObj);
    }
}

module.exports = new PrintService(config);