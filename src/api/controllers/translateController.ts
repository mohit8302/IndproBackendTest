import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import geoip from 'geoip-lite';
import { v2 as Translate } from '@google-cloud/translate';
import { countryToLanguageMap } from "../../data/countryToLanguageMap";

const debug = true;
const prisma = new PrismaClient();
const translate = new Translate.Translate({ key: `${process.env.GOOGLE_API_KEY}` });

export const translateTexts = async (req: Request, res: Response) => {
    let debug_info = debug ? {
        ip: req.ip,
        headers: req.headers,
        remoteAddress: req.socket?.remoteAddress
    } : null;

    // Function to normalize IPv4-mapped IPv6 addresses
    const normalizeIp = (ip: string) => {
        if (ip.startsWith('::ffff:')) {
            return ip.substring(7);
        }
        return ip;
    };

    let clientIp = req.ip;
    if (!clientIp || clientIp === '::1' || clientIp === '127.0.0.1') {
        const forwarded = req.headers['x-forwarded-for'] as string;
        if (forwarded) {
            const forwardedIps = forwarded.split(',').map(ip => ip.trim());
            clientIp = normalizeIp(forwardedIps[0]);
        }
        if (!clientIp || clientIp === '::1' || clientIp === '127.0.0.1') {
            clientIp = normalizeIp(req.socket.remoteAddress as string);
        }
    } else {
        clientIp = normalizeIp(clientIp);
    }

    let country = req.body.country || ''; // Allow country override from request body
    let language = 'en'; // Default to English
    let error: string | null = null;

    const { texts } = req.body;
    let geo = null;

    if (!country) {
        geo = geoip.lookup(clientIp as string);
        if (geo) {
            country = geo.country;
        }
    }

    if (!country) {
        error = 'Unable to determine location from IP';
        return res.status(200).json({
            ip: clientIp,
            country: country,
            local: language,
            original: texts,
            translation: texts, // Fallback to original texts
            error: error,
            debug_info
        });
    } else {
        language = countryToLanguageMap[country] || 'en';
    }

    try {
        let translationMap = texts;
        if (language !== 'en') {
            const translationKeys = Object.keys(texts);
            const translationTexts = translationKeys.map(key => texts[key]);

            const existingTranslations = await prisma.translation.findMany({
                where: {
                    original: { in: translationTexts },
                    targetLang: language
                }
            });

            const existingTranslationMap = existingTranslations.reduce((acc, trans) => {
                acc[trans.original] = trans.translated;
                return acc;
            }, {} as { [key: string]: string });

            const textsToTranslate = translationTexts.filter(text => !existingTranslationMap[text]);

            if (textsToTranslate.length > 0) {
                const [translations] = await translate.translate(textsToTranslate, language);

                const newTranslations = textsToTranslate.map((text, index) => ({
                    original: text,
                    targetLang: language,
                    translated: translations[index]
                }));

                await prisma.translation.createMany({ data: newTranslations });

                newTranslations.forEach(trans => {
                    existingTranslationMap[trans.original] = trans.translated;
                });
            }

            translationMap = translationKeys.reduce((acc, key) => {
                acc[key] = existingTranslationMap[texts[key]];
                return acc;
            }, {} as { [key: string]: string });
        }

        return res.status(200).json({
            ip: clientIp,
            country: country,
            local: language,
            original: texts,
            translation: translationMap,
            error: error,
            debug_info
        });
    } catch (e) {
        return res.status(200).json({
            ip: clientIp,
            country: country,
            local: language,
            original: texts,
            translation: texts, // Fallback to original texts
            error: `Translation failed. Error: ${e}`,
            debug_info
        });
    }
};
