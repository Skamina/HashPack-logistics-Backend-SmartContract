require('dotenv').config();
const express = require('express');
const multer = require('multer');
const crypto = require('crypto');
const {
    Client,
    TopicMessageSubmitTransaction,
    TokenAssociateTransaction,
    TransferTransaction,
    FileCreateTransaction,
    Hbar,
    TokenId,
    AccountId,
    PrivateKey,
} = require('@hashgraph/sdk');

const app = express();
const upload = multer({ dest: 'uploads/' });
app.use(express.json());

const operatorId = AccountId.fromString(process.env.OPERATOR_ID);
const operatorKey = PrivateKey.fromString(process.env.OPERATOR_KEY);
const network = 'testnet';
const client = Client.forName(network).setOperator(operatorId, operatorKey);

const HEDERA_TOPIC_ID = process.env.HEDERA_TOPIC_ID;
const HEDERA_TOKEN_ID = TokenId.fromString(process.env.HEDERA_TOKEN_ID);
const REWARD_AMOUNT = 10;
const PORT = process.env.PORT || 3000;

app.post('/delivery/update-status', async (req, res) => {
    const { deliveryId, riderId, status } = req.body;
    if (!deliveryId || !riderId || !status) return res.status(400).send('Missing parameters');
    const message = JSON.stringify({ deliveryId, riderId, status, timestamp: Date.now() });

    try {
        const submitTx = new TopicMessageSubmitTransaction()
            .setTopicId(HEDERA_TOPIC_ID)
            .setMessage(message);

        const submitResponse = await submitTx.execute(client);
        const receipt = await submitResponse.getReceipt(client);
        res.json({ status: 'logged', consensusStatus: receipt.status.toString() });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/delivery/reward', async (req, res) => {
    const { riderAccountId } = req.body;
    if (!riderAccountId) return res.status(400).send('Missing riderAccountId');

    try {
        const transferTx = await new TransferTransaction()
            .addTokenTransfer(HEDERA_TOKEN_ID, operatorId, -REWARD_AMOUNT)
            .addTokenTransfer(HEDERA_TOKEN_ID, AccountId.fromString(riderAccountId), REWARD_AMOUNT)
            .execute(client);

        const receipt = await transferTx.getReceipt(client);
        res.json({ status: 'rewarded', transferStatus: receipt.status.toString() });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/delivery/proof', upload.single('file'), async (req, res) => {
    const file = req.file;
    if (!file) return res.status(400).send('No file uploaded');

    try {
        const fileBuffer = require('fs').readFileSync(file.path);
        const hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

        const fileCreateTx = new FileCreateTransaction()
            .setContents(hash)
            .setKeys([operatorKey.publicKey]);

        const fileCreateSubmit = await fileCreateTx.execute(client);
        const fileReceipt = await fileCreateSubmit.getReceipt(client);

        res.json({ status: 'proof logged', hash, hfsFileId: fileReceipt.fileId.toString() });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.listen(PORT, () => {
    console.log(`Hedera Logistics server running on port ${PORT}`);
});
