const AWS = require('aws-sdk');
const express = require('express');
const uuid = require('uuid');

let CASO_TABLE = "Caso";
let PHOTO_TABLE= "Photo";

if(process.env.ENV && process.env.ENV !== "NONE") {
  CASO_TABLE = CASO_TABLE + '-' + process.env.ENV;
  PHOTO_TABLE = PHOTO_TABLE + '-' + process.env.ENV;
}
AWS.config.update({ region: process.env.TABLE_REGION });

const dynamoDb = new AWS.DynamoDB.DocumentClient();

const router = express.Router();

router.get('/cases', (req, res) => {
    const params = {
        TableName: CASO_TABLE
    };
    dynamoDb.scan(params, (error, result) => {
        if (error) {
            res.status(400).json({ error: 'Error fetching the cases' });
        }
        res.json(result.Items);
    });
});
router.get('/cases/:id', (req, res) => {
    const id = req.params.id;
    const params = {
        TableName: PHOTO_TABLE,
        Key: {id}
    };
    console.log(params);

    dynamoDb.get(params, (error, result) => {
        if (error) {
            console.log("Sucedio un error");
            res.status(400).json({ error: 'Error retrieving Photo Case' });
        }
        if (result.Item) {
            console.log(result.Item);
            
            res.json(result.Item);
        } 
        else {
            console.log("No encontre el dato un error");
            res.status(404).json({ error: `Case not found` });
        }
    });
});
router.post('/cases', (req, res) => {
    const rightNow = new Date();
    const createdAt = rightNow.toISOString();
    const updatedAt = createdAt;
    const name = req.body.name;
    const status =  "Nuevo";
    const owner = req.body.owner;
    const id = uuid.v4();
    const params = {
        TableName: CASO_TABLE,
        Item: {
            id,
            createdAt,
            name,
            owner,
            status,
            updatedAt
        },
    };
    dynamoDb.put(params, (error, data) => {
        if (error) {
            res.statusCode = 500;
            res.json({error: error, url: req.url, body: req.body});
        }
        else{
            res.json({success: 'post call succeed!', url: req.url, data: data})
        }   
    });
});

router.delete('/cases/:id', (req, res) => {
    const id = req.params.id;
    const params = {
        TableName: CASO_TABLE,
        Key: {
            id
        }
    };
    dynamoDb.delete(params, (error) => {
        if (error) {
            res.status(400).json({ error: 'Could not delete Case' });
        }
        res.json({ success: true });
    });
});
router.put('/cases', (req, res) => {
    const id = req.body.id;
    const name = req.body.name;
    const status = req.body.status;
    const rightNow = new Date();
    const updatedAt = rightNow.toISOString();
    const params = {
        TableName: CASO_TABLE,
        Key: {
            id
        },
        UpdateExpression: 'set #name = :name, #status = :status, #updatedAt = :updatedAt',
        ExpressionAttributeNames: { '#name': 'name', '#status' : 'status', '#updatedAt' :'updatedAt'},
        ExpressionAttributeValues: { ':name': name, ':status': status, ':updatedAt':updatedAt },
        ReturnValues: "ALL_NEW"
    }
    dynamoDb.update(params, (error, result) => {
        if (error) {
            res.status(400).json({ error: 'Could not update Employee' });
        }
        res.json(result.Attributes);
    })
});
module.exports = router;