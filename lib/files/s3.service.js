const {S3Client, HeadObjectCommand, PutObjectCommand, GetObjectCommand} = require('@aws-sdk/client-s3')

class S3Service {
  constructor() {
    this.s3Client = new S3Client({
      region: process.env.S3_REGION,
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY,
        secretAccessKey: process.env.S3_SECRET_KEY
      },
      endpoint: process.env.S3_ENDPOINT
    })
  }

  async checkS3FileExists(fileId) {
    try {
      await this.s3Client.send(new HeadObjectCommand({
        Bucket: process.env.S3_CONTAINER_ID,
        Key: fileId
      }))
      return true
    } catch {
      return false
    }
  }

  async getS3File(fileId) {
    const response = await this.s3Client.send(new GetObjectCommand({
      Bucket: process.env.S3_CONTAINER_ID,
      Key: fileId
    }))

    const stream = response.Body

    return new Promise((resolve, reject) => {
      const chunks = []
      stream.on('data', chunk => chunks.push(chunk))
      stream.once('end', () => resolve(Buffer.concat(chunks)))
      stream.once('error', reject)
    })
  }

  async uploadS3File(fileId, data) {
    return this.s3Client.send(new PutObjectCommand({
      Bucket: process.env.S3_CONTAINER_ID,
      Key: fileId,
      Body: data
    }))
  }
}

module.exports = new S3Service()
