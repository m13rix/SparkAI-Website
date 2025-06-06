const express = require('express');
const bodyParser = require('body-parser');
const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, ListObjectsV2Command } = require("@aws-sdk/client-s3");
const { LRUCache } = require('lru-cache');
const zlib = require('zlib');
const { pipeline } = require('stream');
const { promisify } = require('util');
const BUCKET   = 'spark-ai-users';
const ENDPOINT = 'https://s3.regru.cloud';


// 1) Инициализация S3Client
const s3 = new S3Client({
    endpoint: ENDPOINT,
    region: 'us-east-1',
    credentials: {
        accessKeyId: "PTP24JMBKE5ES368JG20",
        secretAccessKey: "HqYyUhENbE6VYabNsZxFSayE0CshBdUjhhpnZKLg",
    },
    forcePathStyle: true,
});

// 2) LRU‑кэш
const cache = new LRUCache({ max: 10000, ttl: 1000 * 60 * 5 });

// Вспомогательный конвертер стрима в буфер
const streamToBuffer = async (stream) => {
    const chunks = [];
    for await (const c of stream) chunks.push(c);
    return Buffer.concat(chunks);
};

// Вспомогательный ключ
const makeKey = id => `users/${id % 10}/${id}.json.gz`;

async function GET_USER(req, res){
    const id = req.params.id;
    if (cache.has(id)) {
        return res.json(cache.get(id));
    }
    try {
        const { Body } = await s3.send(new GetObjectCommand({
            Bucket: BUCKET,
            Key: makeKey(id)
        }));
        const buf = await streamToBuffer(Body);
        const json = JSON.parse(zlib.gunzipSync(buf).toString());
        cache.set(id, json);
        res.json(json);
    } catch (err) {
        if (err.name === 'NoSuchKey') return res.status(404).send('Not found');
        console.error(err);
        res.status(500).send('Error');
    }
}

async function UPDATE_USER(req, res){
    const id = req.params.id;
    const newData = req.body;
    let oldData = {};
    try {
        const existing = await s3.send(new GetObjectCommand({
            Bucket: BUCKET,
            Key: makeKey(id)
        }));
        const buf = await streamToBuffer(existing.Body);
        oldData = JSON.parse(zlib.gunzipSync(buf).toString());
    } catch (err) {
        if (err.name !== 'NoSuchKey') {
            console.error(err);
            return res.status(500).send('Error fetching existing');
        }
    }
    const merged = { ...oldData, ...newData };
    const gz = zlib.gzipSync(JSON.stringify(merged));
    await s3.send(new PutObjectCommand({
        Bucket: BUCKET,
        Key: makeKey(id),
        Body: gz,
        ContentEncoding: 'gzip',
        ContentType: 'application/json'
    }));
    cache.set(id, merged);
    res.json(merged);
}

async function DELETE_USER(req, res){
    const id = req.params.id;
    try {
        await s3.send(new DeleteObjectCommand({
            Bucket: BUCKET,
            Key: makeKey(id)
        }));
        cache.delete(id);
        res.sendStatus(204);
    } catch (err) {
        console.error(err);
        res.status(500).send('Error deleting');
    }
}


module.exports = {
    GET_USER, DELETE_USER, UPDATE_USER
};
