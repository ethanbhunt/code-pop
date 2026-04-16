module.exports = {
  apps : [{
    name: "codepop-bootstrap",
    script: "bootstrap-node.js",
    env: {
      GCS_BUCKET: "address-config"
    }
  }]
}
