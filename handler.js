const fs = require('fs');
const runner = require('backstopjs/core/runner');

module.exports.index = async (event) => {
  console.log('Received request');

  let data;

  try {
    data = JSON.parse(event.body);
  } catch (e) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'unreadable body',
      }),
    };
  }

  /**
     * We have to create a random directory for each run
     * because of how backstopjs works.
     * Basically, it uses nodejs "require" to load the dependant JS (e.g.: onReadyScript)
     * This means that the script content may get cached between calls, which we never want.
     */
  const rand = Math.floor(Math.random() * 10000000000);
  const baseConfig = `/tmp/backstop/${rand}/`;
  const basePath = '/tmp/tested-images';

  if (!fs.existsSync('/tmp/backstop')) {
    fs.mkdirSync('/tmp/backstop');
  }

  if (!fs.existsSync(baseConfig)) {
    fs.mkdirSync(baseConfig);
  }

  /**
     * Update backstop.json config to change some paths.
     * Serverless functions can only access /tmp, so this is a must
     */
  Object.keys(data).forEach((fileName) => {
    let writeData = data[fileName];

    if (fileName === 'backstop.json') {
      writeData = JSON.parse(writeData);
      writeData.paths.engine_scripts = baseConfig;
      writeData = JSON.stringify(writeData);
    }

    fs.writeFileSync(baseConfig + fileName, writeData);
  });

  try {
    await runner('reference', {
      config: `${baseConfig}backstop.json`,
    });
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify(error),
    };
  }

  const files = fs.readdirSync(basePath);
  const fileObj = {};

  files.forEach((fileName) => {
    const bitmap = fs.readFileSync(`${basePath}/${fileName}`);
    fileObj[fileName] = new Buffer(bitmap).toString('base64');
  });

  return {
    statusCode: 200,
    body: JSON.stringify({
      result: fileObj,
    }),
  };
};
