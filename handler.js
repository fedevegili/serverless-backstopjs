const fs = require('fs');
const runner = require('backstopjs/core/runner.js');

module.exports.index = async (event) => {
  console.log(`Received request`);

  let data;

  try {
    data = JSON.parse(event.body);
  } catch(e) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'unreadable body',
      }),
    };
  }

  const rand = Math.floor(Math.random() * 10000000000) + 1;
  const baseConfig = `/tmp/backstop/${rand}/`;
  const basePath = '/tmp/tested-images';

  if (!fs.existsSync('/tmp/backstop')) {
    fs.mkdirSync('/tmp/backstop');
  }

  if (!fs.existsSync(baseConfig)) {
    fs.mkdirSync(baseConfig);
  }

  Object.keys(data).forEach((fileName) => {
    let writeData = data[fileName];

    if (fileName === 'backstop.json') {
      writeData = JSON.parse(writeData);
      writeData.paths.engine_scripts = baseConfig;
      writeData = JSON.stringify(writeData);
    }

    fs.writeFileSync(baseConfig + fileName, writeData);
  });

  await runner('reference', {
    config: baseConfig + 'backstop.json'
  });

  const files = fs.readdirSync(basePath);
  const fileObj = {};

  files.forEach((fileName) => {
    const bitmap = fs.readFileSync(`${basePath}/${fileName}`);
    fileObj[fileName] = new Buffer(bitmap).toString('base64');
  });

  return {
    statusCode: 200,
    body: JSON.stringify({
      result: fileObj
    }),
  };
};
