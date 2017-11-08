var request = require('request')
var path = require('path')
var mkdirp = require('mkdirp')
var validUrl = require('valid-url')
var fs = require('fs')
var _ = require('lodash')
var utils = require('../utils')
var tpl = utils.tpl

/*
  url: required. Can also be an array of urls.
  filepath: specify a complete path to a file
  directory: specify a directory for the downloaded file
 */

function download (data, config) {
  return new Promise((resolve, reject) => {
    try {
      // Handle array of urls
      if (config.url && _.has(data, config.url) && _.isArray(data[config.url])) {
        return data[config.url].reduce((p, url) => p.then(d => download(data, _.assign(config, { url }))), Promise.resolve(data))
      // Handle data property names and strings
      } else if (config.url) {
        // In case this is an object
        if (_.has(data, config.url)) {
          config.url = data[config.url]
        }
        var url = tpl(config.url, data)
        var filepath = (config.filepath) ? tpl(config.filepath, data) : undefined
        var dir = (config.directory) ? tpl(config.directory, data) : undefined
        var overwrite = !(_.has(config, 'overwrite') && config.overwrite === false)
        if (validUrl.isUri(url)) {
          if (filepath) {
            if (!overwrite && fs.existsSync(filepath)) {
              resolve(data)
            } else {
              mkdirp(path.dirname(filepath), function (err) {
                if (err) throw err
                // Stream downloaded file into filesystem
                console.log('Downloading', url, 'to', filepath, data)
                var req = request(url)
                var file = fs.createWriteStream(filepath)
                req.pipe(file)
                file.on('error', reject)
                file.on('close', () => resolve(data))
              })
            }
          } else if (dir) {
            mkdirp(dir, function (err) {
              if (err) throw err
              var filename = path.basename(url)
              filepath = path.join(dir, filename)
              if (!overwrite && fs.existsSync(filepath)) {
                resolve(data)
              } else {
                // Stream downloaded file into filesystem
                console.log('Downloading', url, 'to', filepath)
                var req = request(url)
                var file = fs.createWriteStream(filepath)
                req.pipe(file)
                file.on('error', reject)
                file.on('close', () => resolve(data))
              }
            })
          }
        } else {
          // Not a valid url
          resolve(data)
        }
      } else {
        resolve(data)
      }
    } catch (e) {
      console.log(e)
      reject(data)
    }
  })
}

module.exports = {
  onStart: a => a,
  onData: download,
  onEnd: a => a
}
