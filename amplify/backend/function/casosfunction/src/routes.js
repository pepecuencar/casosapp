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
    const photoCaseId = req.params.id;
    console.log("photoCaseId : " +photoCaseId );
    /*const params = {
        TableName: PHOTO_TABLE,
        FilterExpression: filtro
    };*/
    const params = {
        TableName: PHOTO_TABLE,
        FilterExpression: "photoCaseId = :photoCaseId_val",
        ExpressionAttributeValues: { ":photoCaseId_val": photoCaseId }
    };
    console.log(params);
    dynamoDb.scan(params, result);
    var count = 0;

    function result(err, data) {
        if (err) {console.error("Unable to scan the table. Error JSON:", JSON.stringify(err, null, 2));} 
        else {        
            console.log("Scan succeeded.");
            console.log("Data Items " + data.Items);
            data.Items.forEach(function(itemdata) {
                console.log("Item :", ++count,JSON.stringify(itemdata));
                res.json(data.Items);
            });
            // continue scanning if we have more items
            if (typeof data.LastEvaluatedKey != "undefined") {
                console.log("Scanning for more...");
                params.ExclusiveStartKey = data.LastEvaluatedKey;
                dynamoDb.scan(params, result);
            }
        }
    }
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
            console.log("Case Created Successfully " + params.Item);
            res.status(201).send(params.Item);
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