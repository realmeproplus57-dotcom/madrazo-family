
"use strict";

const express = require("express");
const path = require("path");

const app = express();

const PORT = Number(process.env.PORT) || 3000;
const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL || "";

app.disable("x-powered-by");
app.use(express.json({ limit: "20kb" }));

// ==========================================
// PRODUCTS
// ==========================================

const PRODUCTS = Object.freeze({
    cocaine: Object.freeze({
        name: "Cocaine",
        price: 600
    }),

    meth: Object.freeze({
        name: "Meth",
        price: 600
    })
});

const MAX_QUANTITY = 1000;
const MAX_GANG_NAME_LENGTH = 60;
const MAX_RADIO_LENGTH = 30;
const MAX_LOCATION_LENGTH = 120;

// ==========================================
// STATIC WEBSITE
// ==========================================

const PUBLIC_DIR = path.join(__dirname, "public");

app.use(express.static(PUBLIC_DIR));

app.get("/", (req, res) => {
    res.sendFile(path.join(PUBLIC_DIR, "index.html"));
});

// ==========================================
// VALIDATION HELPERS
// ==========================================

function cleanText(value, maxLength) {
    if (typeof value !== "string") {
        return "";
    }

    return value
        .replace(/[\u0000-\u001F\u007F]/g, "")
        .trim()
        .slice(0, maxLength);
}

function isValidWebhookUrl(value) {
    try {
        const url = new URL(value);

        return (
            url.protocol === "https:" &&
            url.hostname === "discord.com" &&
            /^\/api\/webhooks\/\d+\/[^/]+\/?$/.test(url.pathname)
        );
    } catch {
        return false;
    }
}

// ==========================================
// ORDER API
// ==========================================

app.post("/api/orders", async (req, res) => {
    try {
        const body = req.body;

        if (!body || typeof body !== "object" || Array.isArray(body)) {
            return res.status(400).json({
                message: "بيانات الطلب غير صحيحة."
            });
        }

        const gangName = cleanText(
            body.gangName,
            MAX_GANG_NAME_LENGTH
        );

        const radioNumber = cleanText(
            body.radioNumber,
            MAX_RADIO_LENGTH
        );

        const deliveryLocation = cleanText(
            body.deliveryLocation,
            MAX_LOCATION_LENGTH
        );

        if (!gangName) {
            return res.status(400).json({
                message: "اسم العصابة مطلوب."
            });
        }

        if (
            !Array.isArray(body.products) ||
            body.products.length === 0
        ) {
            return res.status(400).json({
                message: "يجب اختيار منتج واحد على الأقل."
            });
        }

        if (body.products.length > Object.keys(PRODUCTS).length) {
            return res.status(400).json({
                message: "قائمة المنتجات غير صحيحة."
            });
        }

        const seenProducts = new Set();
        const validatedProducts = [];

        let total = 0;
        let totalItems = 0;

        for (const item of body.products) {
            if (!item || typeof item !== "object" || Array.isArray(item)) {
                return res.status(400).json({
                    message: "أحد المنتجات غير صحيح."
                });
            }

            const productId = item.id;

            if (
                typeof productId !== "string" ||
                !Object.prototype.hasOwnProperty.call(PRODUCTS, productId)
            ) {
                return res.status(400).json({
                    message: "يوجد منتج غير معروف."
                });
            }

            if (seenProducts.has(productId)) {
                return res.status(400).json({
                    message: "يوجد منتج مكرر في الطلب."
                });
            }

            seenProducts.add(productId);

            const product = PRODUCTS[productId];

            if (
                !Number.isSafeInteger(item.quantity) ||
                item.quantity < 1 ||
                item.quantity > MAX_QUANTITY
            ) {
                return res.status(400).json({
                    message: "الكمية غير صحيحة."
                });
            }

            const subtotal = product.price * item.quantity;

            if (!Number.isSafeInteger(subtotal)) {
                return res.status(400).json({
                    message: "قيمة الطلب أكبر من المسموح."
                });
            }

            total += subtotal;
            totalItems += item.quantity;

            validatedProducts.push({
                name: product.name,
                quantity: item.quantity,
                unitPrice: product.price,
                subtotal
            });
        }

        if (!Number.isSafeInteger(total) || total <= 0) {
            return res.status(400).json({
                message: "المجموع النهائي غير صحيح."
            });
        }

        // ==========================================
        // WEBHOOK VALIDATION
        // ==========================================

        if (!DISCORD_WEBHOOK_URL) {
            console.error("Discord Webhook is not configured.");

            return res.status(503).json({
                message: "لم يتم إعداد Discord Webhook."
            });
        }

        if (!isValidWebhookUrl(DISCORD_WEBHOOK_URL)) {
            console.error("Discord Webhook URL is invalid.");

            return res.status(500).json({
                message: "رابط Discord Webhook غير صحيح."
            });
        }

        // ==========================================
        // DISCORD EMBED
        // ==========================================

        const productLines = validatedProducts.map(product => {
            return [
                `**${product.name}**`,
                `الكمية: ${product.quantity}`,
                `سعر الوحدة: ${product.unitPrice}$`,
                `المجموع: ${product.subtotal}$`
            ].join("\n");
        });

        const description = [
            "طلب جديد من متجر MADRAZO FAMILY",
            "",
            ...productLines,
            "",
            `**عدد الوحدات:** ${totalItems}`,
            `**المجموع النهائي:** ${total}$`
        ].join("\n");

        const embed = {
            title: "🖤 MADRAZO FAMILY | NEW ORDER",
            description,
            color: 0xD4AF37,

            fields: [
                {
                    name: "اسم العصابة",
                    value: gangName,
                    inline: true
                },
                {
                    name: "رقم الراديو",
                    value: radioNumber || "لم يُحدد",
                    inline: true
                },
                {
                    name: "الموقع داخل اللعبة",
                    value: deliveryLocation || "لم يُحدد",
                    inline: false
                },
                {
                    name: "حالة الطلب",
                    value: "طلب جديد",
                    inline: true
                }
            ],

            footer: {
                text: "MADRAZO FAMILY • Official GTA RP Store"
            },

            timestamp: new Date().toISOString()
        };

        // ==========================================
        // SEND TO DISCORD
        // ==========================================

        const discordResponse = await fetch(
            DISCORD_WEBHOOK_URL,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    username: "MADRAZO FAMILY",
                    embeds: [embed],
                    allowed_mentions: {
                        parse: []
                    }
                }),
                signal: AbortSignal.timeout(15000)
            }
        );

        if (!discordResponse.ok) {
            const discordError = await discordResponse.text();

            console.error(
                "Discord HTTP Error:",
                discordResponse.status,
                discordError.slice(0, 1000)
            );

            return res.status(502).json({
                message: `Discord رفض الطلب. رمز الخطأ: ${discordResponse.status}`
            });
        }

        console.log("SUCCESS: Order sent to Discord.");

        return res.status(200).json({
            success: true,
            message: "تم إرسال الطلب بنجاح."
        });

    } catch (error) {
        console.error(
            "ORDER ERROR:",
            error.name,
            error.message
        );

        return res.status(500).json({
            message: "حدث خطأ أثناء معالجة الطلب."
        });
    }
});

// ==========================================
// START SERVER
// ==========================================

app.listen(PORT, () => {
    console.log("-------------------------------------");
    console.log(" MADRAZO FAMILY STORE");
    console.log(` Server running on port ${PORT}`);
    console.log("-------------------------------------");
});
