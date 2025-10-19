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

let deliveries = [];

app.post("/api/assign-delivery", async (req, res) => {
  try {
    const { packageId, riderId, customerId, deliveryAddress } = req.body;

    if (!packageId || !riderId || !customerId || !deliveryAddress) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const assignedDelivery = {
      packageId,
      riderId,
      customerId,
      deliveryAddress,
      status: "Assigned",
      assignedAt: new Date().toISOString(),
    };

    console.log("Delivery assigned:", assignedDelivery);

    return res.status(201).json({
      message: "Delivery successfully assigned to rider",
      data: assignedDelivery,
    });
  } catch (error) {
    console.error("Error assigning delivery:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.post('/api/delivery/start', (req, res) => {
  const { packageId, riderId } = req.body;

  if (!packageId || !riderId) {
    return res.status(400).json({ error: "packageId and riderId are required" });
  }

  const delivery = deliveries[packageId];
  if (!delivery || delivery.riderId !== riderId) {
    return res.status(404).json({ error: "Delivery not found or rider mismatch" });
  }

  delivery.status = "In Progress";
  delivery.startTime = new Date().toISOString();

  console.log(`Notify customer: Package ${packageId} is now in progress. Rider ${riderId} is delivering.`);

  return res.status(200).json({
    message: "Delivery started successfully",
    data: delivery
  });
});

app.get('/api/delivery/track/:packageId', (req, res) => {
  const { packageId } = req.params;
  const delivery = deliveries.find(d => d.packageId === packageId);

  if (!delivery) {
    return res.status(404).json({ error: "Delivery not found" });
  }

  const trackingInfo = {
    riderId: delivery.riderId,
    packageId: delivery.packageId,
    status: delivery.status || "In Progress",
    location: {
      latitude: 10.315,
      longitude: 9.843
    },
    lastUpdated: new Date().toISOString()
  };

  res.json(trackingInfo);
});

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

app.post("/api/delivery/adminverify/:packageid", async (req, res) => {
  try {
    const { packageid } = req.params;
    const delivery = await Delivery.findOne({ packageid });

    if (!delivery)
      return res.status(404).json({ error: "Delivery not found" });
    if (delivery.status !== "delivered")
      return res.status(400).json({ error: "Delivery not yet delivered" });

    delivery.status = "verified";
    delivery.verifiedAt = new Date();

    const rewardAmount = 50;
    delivery.reward = rewardAmount;

    await delivery.save();

    console.log(
      `✅ Delivery ${packageid} verified and rider ${delivery.riderId} rewarded ₦${rewardAmount}`
    );

    res.status(200).json({
      message: "Delivery verified successfully and rider rewarded automatically",
      packageid,
      riderId: delivery.riderId,
      rewardAmount,
    });
  } catch (err) {
    console.error("Admin verification error:", err);
    res.status(500).json({ error: "Server error during verification" });
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

res.json({ status: "proof logged", hash });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/delivery/:packageId", async (req, res) => {
  try {
    const { packageId } = req.params;

    const trackingData = {
      packageId,
      rider: "RDR456",
      status: "Delivered",
      proofHash: "Qm9dfg123456abc789",
      timestamp: new Date().toISOString(),
    };

    return res.status(200).json({
      message: "Delivery tracking fetched successfully",
      data: trackingData,
    });
  } catch (error) {
    console.error("Error in delivery tracking:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.listen(PORT, () => {
  console.log(`Hedera Logistics server running on port ${PORT}`);
});
