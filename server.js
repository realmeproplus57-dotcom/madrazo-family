
"use strict";

require("dotenv").config();

const express = require("express");
const path = require("path");

const app = express();

const PORT = Number(process.env.PORT) || 3000;
const DELIVERY_FEE = Number(process.env.DELIVERY_FEE || 650);
const MAX_QUANTITY = 1000;

const PRODUCTS = {
    cocaine: { name: "Cocaine", price: 750 },
    weed: { name: "Weed", price: 750 }
};

app.disable("x-powered-by");
app.use(express.json({ limit: "20kb" }));
app.use(express.static(path.join(__dirname, "public")));

// ==========================================
// DISCORD WEBHOOK
// ==========================================

function getWebhookUrl() {
    // يقبل الاسمين لتفادي اختلاف .env
    const webhookUrl =
        process.env.DISCORD_WEBHOOK_URL ||
        process.env.DISCORD_WEBHOOKURL;

    if (!webhookUrl) {
        throw new Error("Discord webhook is missing.");
    }

    let parsed;

    try {
        parsed = new URL(webhookUrl);
    } catch {
        throw new Error("Invalid Discord webhook URL.");
    }

    const validHost = [
        "discord.com",
        "discordapp.com"
    ].includes(parsed.hostname);

    const validPath =
        /^\/api\/webhooks\/\d+\/[^/]+\/?$/.test(parsed.pathname);

    if (
        parsed.protocol !== "https:" ||
        !validHost ||
        !validPath
    ) {
        throw new Error("Invalid Discord webhook URL.");
    }

    return webhookUrl;
}

// ==========================================
// HELPERS
// ==========================================

function cleanText(value, maxLength) {
    if (typeof value !== "string") return "";

    return value
        .trim()
        .replace(/[\u0000-\u001F\u007F]/g, "")
        .slice(0, maxLength);
}

function formatPrice(value) {
    return value.toLocaleString("en-US") + "$";
}

// ==========================================
// ORDER API
// ==========================================

app.post("/api/orders", async (req, res) => {
    try {
        const {
            products,
            gangName,
            radio,
            location,
            delivery
        } = req.body || {};

        console.log("Received order:", JSON.stringify(req.body));

        // Validate products object
        if (
            !products ||
            typeof products !== "object" ||
            Array.isArray(products)
        ) {
            return res.status(400).json({
                success: false,
                message: "قائمة المنتجات غير صالحة."
            });
        }

        // Reject unknown product names
        const unknownProducts = Object.keys(products).filter(
            key => !Object.prototype.hasOwnProperty.call(PRODUCTS, key)
        );

        if (unknownProducts.length > 0) {
            console.error("Unknown products:", unknownProducts);

            return res.status(400).json({
                success: false,
                message: "يوجد منتج غير صالح: " + unknownProducts.join(", ")
            });
        }

        // Read and validate quantities
        const quantities = {
            cocaine: products.cocaine ?? 0,
            weed: products.weed ?? 0
        };

        for (const key of Object.keys(PRODUCTS)) {
            const quantity = quantities[key];

            if (
                !Number.isSafeInteger(quantity) ||
                quantity < 0 ||
                quantity > MAX_QUANTITY
            ) {
                console.error("Invalid quantity:", key, quantity);

                return res.status(400).json({
                    success: false,
                    message: "كمية المنتج غير صالحة: " + key
                });
            }
        }

        const totalQuantity =
            quantities.cocaine + quantities.weed;

        if (totalQuantity < 1) {
            return res.status(400).json({
                success: false,
                message: "يرجى اختيار منتج واحد على الأقل."
            });
        }

        // Validate customer information
        const cleanGangName = cleanText(gangName, 80);
        const cleanRadio = cleanText(radio, 40);
        const cleanLocation = cleanText(location, 160);

        if (!cleanGangName || !cleanRadio || !cleanLocation) {
            return res.status(400).json({
                success: false,
                message: "يرجى ملء جميع المعلومات المطلوبة."
            });
        }

        // Validate delivery
        if (!["delivery", "pickup"].includes(delivery)) {
            return res.status(400).json({
                success: false,
                message: "طريقة الاستلام غير صالحة."
            });
        }

        // Calculate prices on server
        const cocaineTotal =
            PRODUCTS.cocaine.price * quantities.cocaine;

        const weedTotal =
            PRODUCTS.weed.price * quantities.weed;

        const subtotal = cocaineTotal + weedTotal;

        const deliveryCost =
            delivery === "delivery" ? DELIVERY_FEE : 0;

        const total = subtotal + deliveryCost;

        // Validate webhook configuration
        const webhookUrl = getWebhookUrl();

        // Build product fields
        const productFields = [];

        if (quantities.cocaine > 0) {
            productFields.push({
                name: "🧪 COCAINE",
                value:
                    `Quantity: ${quantities.cocaine}\n` +
                    `Unit Price: ${formatPrice(PRODUCTS.cocaine.price)}\n` +
                    `Total: ${formatPrice(cocaineTotal)}`,
                inline: true
            });
        }

        if (quantities.weed > 0) {
            productFields.push({
                name: "🌿 WEED",
                value:
                    `Quantity: ${quantities.weed}\n` +
                    `Unit Price: ${formatPrice(PRODUCTS.weed.price)}\n` +
                    `Total: ${formatPrice(weedTotal)}`,
                inline: true
            });
        }

        // Discord message
        const discordMessage = {
            username: "MADRAZO FAMILY STORE",
            embeds: [{
                title: "🛒 NEW ORDER - MADRAZO FAMILY",
                description: "طلب جديد من المتجر الإلكتروني.",
                color: 0xD4AF37,
                fields: [
                    ...productFields,
                    {
                        name: "📦 TOTAL QUANTITY",
                        value: String(totalQuantity),
                        inline: true
                    },
                    {
                        name: "👥 GANG NAME",
                        value: cleanGangName,
                        inline: true
                    },
                    {
                        name: "📻 RADIO",
                        value: cleanRadio,
                        inline: true
                    },
                    {
                        name: "📍 LOCATION",
                        value: cleanLocation,
                        inline: false
                    },
                    {
                        name: "🚚 DELIVERY",
                        value: delivery === "delivery"
                            ? "Delivery"
                            : "Pickup",
                        inline: true
                    },
                    {
                        name: "🧾 SUBTOTAL",
                        value: formatPrice(subtotal),
                        inline: true
                    },
                    {
                        name: "🚗 DELIVERY FEE",
                        value: formatPrice(deliveryCost),
                        inline: true
                    },
                    {
                        name: "💰 TOTAL",
                        value: `**${formatPrice(total)}**`,
                        inline: false
                    }
                ],
                footer: {
                    text: "MADRAZO FAMILY • OFFICIAL STORE"
                },
                timestamp: new Date().toISOString()
            }],
            allowed_mentions: {
                parse: []
            }
        };

        // Send to Discord
        const controller = new AbortController();

        const timeout = setTimeout(() => {
            controller.abort();
        }, 10000);

        let discordResponse;

        try {
            discordResponse = await fetch(webhookUrl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(discordMessage),
                signal: controller.signal
            });
        } finally {
            clearTimeout(timeout);
        }

        if (!discordResponse.ok) {
            const errorText = await discordResponse.text();

            console.error(
                "Discord error:",
                discordResponse.status,
                errorText
            );

            return res.status(502).json({
                success: false,
                message: "Discord رفض إرسال الطلب. تحقق من Webhook."
            });
        }

        console.log(
            `[NEW ORDER] Cocaine x${quantities.cocaine} | ` +
            `Weed x${quantities.weed} | ` +
            `${cleanGangName} | ${formatPrice(total)}`
        );

        return res.status(200).json({
            success: true,
            message: "تم إرسال طلبك بنجاح!"
        });

    } catch (error) {
        console.error("ORDER ERROR:", error);

        return res.status(500).json({
            success: false,
            message: error.name === "AbortError"
                ? "انتهت مهلة إرسال الطلب."
                : "حدث خطأ أثناء معالجة الطلب."
        });
    }
});

// ==========================================
// 404
// ==========================================

app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: "الصفحة غير موجودة."
    });
});

// ==========================================
// START SERVER
// ==========================================

app.listen(PORT, () => {
    console.log("----------------------------------");
    console.log("MADRAZO FAMILY STORE");
    console.log(`Server running on port ${PORT}`);
    console.log(`http://localhost:${PORT}`);
    console.log("----------------------------------");
});
