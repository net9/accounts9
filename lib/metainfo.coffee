mongoose = require "./mongoose"

class Metainfo

mongoose.model "Metainfo", new mongoose.Schema(
  group_timestamp: Date
)

Metainfo.model = mongoose.model("Metainfo")

module.exports = Metainfo

Metainfo.updateGroup = (callback) ->
  Metainfo.model.findOne {}, (err, meta) ->
    if not meta
      meta = new Metainfo.model()
    meta.group_timestamp = new Date()
    meta.save callback

Metainfo.groupTimestamp = (callback) ->
  Metainfo.model.findOne {}, (err, meta) ->
    return callback err if err
    callback null, meta.group_timestamp
