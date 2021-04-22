const ora = require('ora');
const fs = require('fs')
const request = require('request')
const moment = require('moment');
const chalk = require('chalk');
const ExcelJS = require('exceljs');
const messages = require('../data/messages.json')
const flow = require('../data/flow.json')
const { Client, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const qr = require('qr-image');

const SESSION_FILE_PATH = `${__dirname}/../../../session.json`;
const TMP_PATH = `${__dirname}/../../../tmp`;
const CHAT_PATH = `${__dirname}/../../chats`;

let client;
const generateImage = (base64) => {
    let qr_svg = qr.image(base64, { type: 'svg', margin: 4 });
    qr_svg.pipe(require('fs').createWriteStream('./public/qr-code.svg'));
    console.log(`${chalk.blueBright('⚡ Recuerda que el QR se actualiza cada minuto ⚡')}`);
    console.log(`${chalk.blueBright('⚡ Actualiza F5 el navegador para mantener el mejor QR⚡')}`);
}

/**
 * Descargar imagenes de URL
 * @param {*} url 
 * @param {*} path 
 * @param {*} callback 
 */

const download = (url, path, callback) => {
    request.head(url, (err, res, body) => {
        request(url)
            .pipe(fs.createWriteStream(path))
            .on('close', callback)
    })
}

/**
 * Actualizar datos de configuracion
 */

const updateConfig = (key, value) => {
    const configJson = `${__dirname}/../data/config.json`;
    let content = JSON.parse(fs.readFileSync(configJson, 'utf8'));
    // edit or add property
    content[key] = value;
    //write file
    fs.writeFileSync(configJson, JSON.stringify(content));
}

/**
 * Obtener datos de configuracion
 */

const getConfig = (key) => {
    const configJson = `${__dirname}/../data/config.json`;
    let content = JSON.parse(fs.readFileSync(configJson, 'utf8'));
    // edit or add property
    const value = content[key];
    return value
}

/**
 * Buscamos el producto por el ID
 */

const findItemById = (id) => {
    id = id.replace('[', '').replace(']', '');
    const itemJson = `${__dirname}/../data/items.json`;
    let content = JSON.parse(fs.readFileSync(itemJson, 'utf8'));
    const getItem = content.find(item => item.id === id)
    return getItem;
}

/**
 * Revisamos si tenemos credenciales guardadas para inciar sessio
 * este paso evita volver a escanear el QRCODE
 */
const withSession = () => {
    const spinner = ora(`Cargando ${chalk.yellow('Validando session con Whatsapp...')}`);
    sessionData = require(SESSION_FILE_PATH);
    spinner.start();
    client = new Client({
        session: sessionData
    });

    client.on('ready', () => {
        console.log('Client is ready!');
        spinner.stop();
        connectionReady();

    });



    client.on('auth_failure', () => {
        spinner.stop();
        console.log('** Error de autentificacion vuelve a generar el QRCODE (Debes Borrar el archivo session.json) **');
    })


    client.initialize();
}


/**
 * Guardar historial de conversacion
 * @param {*} number 
 * @param {*} message 
 */
const readChat = (number, message, step = null) => new Promise((resolve, reject) => {

    setTimeout(() => {
        number = number.replace('@c.us', '');
        number = `${number}@c.us`
        const pathExcel = `${CHAT_PATH}/${number}.xlsx`;
        const workbook = new ExcelJS.Workbook();
        const today = moment().format('DD-MM-YYYY hh:mm')

        if (fs.existsSync(pathExcel)) {
            /**
             * Si existe el archivo de conversacion lo actualizamos
             */
            const workbook = new ExcelJS.Workbook();
            workbook.xlsx.readFile(pathExcel)
                .then(() => {
                    const worksheet = workbook.getWorksheet(1);
                    const lastRow = worksheet.lastRow;
                    let getRowInsert = worksheet.getRow(++(lastRow.number));
                    getRowInsert.getCell('A').value = today;
                    getRowInsert.getCell('B').value = message;

                    if (step) {
                        getRowInsert.getCell('C').value = step;
                    }

                    getRowInsert.commit();
                    workbook.xlsx.writeFile(pathExcel);

                    const getRowPrevStep = worksheet.getRow(lastRow.number);
                    const lastStep = getRowPrevStep.getCell('C').value
                    resolve(lastStep)
                })
                .catch((err) => {
                    console.log('ERR', err);
                    reject('error')
                })



        } else {
            /**
             * NO existe el archivo de conversacion lo creamos
             */
            const worksheet = workbook.addWorksheet('Chats');
            worksheet.columns = [
                { header: 'Fecha', key: 'number_customer' },
                { header: 'Mensajes', key: 'message' },
                { header: 'Paso', key: 'step' },
            ];

            step = step || ''

            worksheet.addRow([today, message, step]);
            workbook.xlsx.writeFile(pathExcel)
                .then(() => {
                    resolve('STEP_1')
                })
                .catch((err) => {
                    console.log('Error', err);
                    reject('error')
                });

        }
    }, 150)

});

/**
 * Generamos un QRCODE para iniciar sesion
 */
const withOutSession = () => {
    console.log(`${chalk.greenBright('🔴🔴 No tenemos session guardada, espera que se generar el QR CODE 🔴🔴')}`);

    client = new Client();
    client.on('qr', qr => {
        qrcode.generate(qr, { small: true });
        generateImage(qr)
    });

    client.on('ready', () => {
        const { pushname, me } = client.info;
        updateConfig('ws', me.user)
        sendMessage(me.user, 'Hola conexion EXITOSA reinicia el script para agarra la nueva configuracion')
        connectionReady();
    });

    client.on('auth_failure', () => {
        console.log('** Error de autentificacion vuelve a generar el QRCODE **');
    })


    client.on('authenticated', (session) => {

        // Guardamos credenciales de de session para usar luego
        sessionData = session;
        fs.writeFile(SESSION_FILE_PATH, JSON.stringify(session), function (err) {
            if (err) {
                console.log(err);
            }
        });
    });

    client.initialize();
}

/**
 * Enviamos un mensaje simple (texto) a nuestro cliente
 * @param {*} number 
 */
const sendMessage = (number = null, text = null) => new Promise((resolve, reject) => {
    number = number.replace('@c.us', '');
    number = `${number}@c.us`
    const message = text;
    const msg = client.sendMessage(number, message);
    console.log(`${chalk.red('⚡⚡⚡ Enviando mensajes....')}`);
    resolve(msg)
})


/**
 * Enviamos archivos multimedia a nuestro cliente
 * @param {*} number 
 * @param {*} fileName 
 */
const sendMedia = (number, url = '', text = null) => new Promise((resolve, reject) => {
    number = number.replace('@c.us', '');
    number = `${number}@c.us`
    const nameFile = url.split('/').reverse().find(() => true)

    download(url, `${TMP_PATH}/${nameFile}`, () => {
        const media = MessageMedia.fromFilePath(`${TMP_PATH}/${nameFile}`);
        const msg = client.sendMessage(number, media, { caption: text || null });
        resolve(msg)
    })


})

const connectionReady = () => {

    /** Aqui escuchamos todos los mensajes que entran */
    client.on('message', async msg => {
        let { body } = msg;
        const { from } = msg;
        body = body.toLowerCase();
        let step = await readChat(from, body)
        const findIdItem = /\[[\d.]*\]/ig;
        const triggerItem = findIdItem.exec(body);


        if (flow.GREETINGS.includes(body)) {
            const getHomeUrl = getConfig('home_site')
            let msg = messages.GREETINGS.join('\n')
            msg = msg.replace('%HOME_URL%', getHomeUrl)
            sendMessage(from, msg)
            await readChat(from, body)
            return

        }

        /**
         * Reivsamos si tiene ID de producto
         */

        if (triggerItem) {

            const item = findItemById(triggerItem[0])
            const imagesItem = item.images || []
            const listQueue = imagesItem.map(img => {
                return sendMedia(from, img.url, img.message)
            })

            Promise.all(listQueue).then(() => {
                sendMessage(from, item.ws.main_message.join('\n'))
            })

            await readChat(from, body, `STEP_2_ITEM_${item.id}`)
            return
        }

        /**
         * 
         */
        if (step && step.includes('STEP_2_ITEM_')) {
            let getItem = step.split('STEP_2_ITEM_')
            getItem = getItem.reverse()[0] || null
            const item = findItemById(getItem)

            if (item && item.ws.trigger_ok.includes(body)) {
                sendMessage(from, messages.MESSAGE_OK.join('\n'))
            }

            await readChat(from, body)
            return;
        }

        sendMessage(from, messages.ERROR.join('\n'))
        return


    })

}

module.exports = { withOutSession, withSession }