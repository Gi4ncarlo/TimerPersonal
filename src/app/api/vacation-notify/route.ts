import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

// Email notification wrapper for vacation periods
// Uses Gmail SMTP with App Password authentication

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
    },
});

interface NotifyPayload {
    type: 'start' | 'end_warning';
    userEmail: string;
    userName: string;
    startDate: string;
    endDate: string;
    reason: string;
}

function buildStartEmail(payload: NotifyPayload): { subject: string; html: string } {
    return {
        subject: `🏖 Tu período de vacaciones ha comenzado`,
        html: `
            <div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; background: #1a1a2e; color: #e0e0e0; padding: 32px; border-radius: 12px;">
                <h1 style="color: #00c896; margin-bottom: 8px;">🏖 Vacaciones Activadas</h1>
                <p style="color: #aaa; margin-bottom: 24px;">Hola <strong style="color: #fff;">${payload.userName}</strong>,</p>
                
                <div style="background: rgba(0, 200, 150, 0.1); border: 1px solid #00c896; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
                    <p style="margin: 0 0 12px 0; font-size: 16px;">Tu período de vacaciones ha comenzado oficialmente.</p>
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td style="padding: 8px 0; color: #aaa;">📅 Inicio:</td>
                            <td style="padding: 8px 0; font-weight: bold; color: #fff;">${payload.startDate}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; color: #aaa;">📅 Fin:</td>
                            <td style="padding: 8px 0; font-weight: bold; color: #fff;">${payload.endDate}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; color: #aaa;">📝 Motivo:</td>
                            <td style="padding: 8px 0; color: #fff;">${payload.reason}</td>
                        </tr>
                    </table>
                </div>
                
                <p style="color: #888; font-size: 14px;">
                    Durante este período no recibirás strikes por inactividad. 
                    Recibirás un recordatorio un día antes de que finalice.
                </p>
                <hr style="border: none; border-top: 1px solid #333; margin: 20px 0;" />
                <p style="color: #555; font-size: 12px;">Senda de Logros — Sistema de Vacaciones</p>
            </div>
        `,
    };
}

function buildEndWarningEmail(payload: NotifyPayload): { subject: string; html: string } {
    return {
        subject: `⚠️ Tus vacaciones terminan mañana`,
        html: `
            <div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; background: #1a1a2e; color: #e0e0e0; padding: 32px; border-radius: 12px;">
                <h1 style="color: #ffaa00; margin-bottom: 8px;">⚠️ Fin de Vacaciones Próximo</h1>
                <p style="color: #aaa; margin-bottom: 24px;">Hola <strong style="color: #fff;">${payload.userName}</strong>,</p>
                
                <div style="background: rgba(255, 170, 0, 0.1); border: 1px solid #ffaa00; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
                    <p style="margin: 0 0 12px 0; font-size: 16px; color: #ffaa00; font-weight: bold;">
                        Tus vacaciones finalizan mañana (${payload.endDate}).
                    </p>
                    <p style="margin: 0; color: #e0e0e0;">
                        A partir del día siguiente tendrás <strong>1 día de gracia</strong> antes de que el sistema de strikes vuelva a activarse.
                    </p>
                </div>
                
                <div style="background: rgba(255, 68, 68, 0.1); border: 1px solid #ff4444; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
                    <p style="margin: 0; color: #ff6666; font-size: 14px;">
                        💡 <strong>Prepárate:</strong> Asegúrate de registrar actividad para evitar strikes cuando vuelvas.
                    </p>
                </div>
                
                <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                    <tr>
                        <td style="padding: 8px 0; color: #aaa;">📅 Período:</td>
                        <td style="padding: 8px 0; color: #fff;">${payload.startDate} → ${payload.endDate}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; color: #aaa;">📝 Motivo:</td>
                        <td style="padding: 8px 0; color: #fff;">${payload.reason}</td>
                    </tr>
                </table>
                
                <hr style="border: none; border-top: 1px solid #333; margin: 20px 0;" />
                <p style="color: #555; font-size: 12px;">Senda de Logros — Sistema de Vacaciones</p>
            </div>
        `,
    };
}

export async function POST(request: NextRequest) {
    try {
        // Validate Gmail configuration
        if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
            return NextResponse.json(
                { error: 'Email configuration missing' },
                { status: 500 }
            );
        }

        const payload: NotifyPayload = await request.json();

        if (!payload.type || !payload.userEmail || !payload.userName) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        const emailContent = payload.type === 'start'
            ? buildStartEmail(payload)
            : buildEndWarningEmail(payload);

        await transporter.sendMail({
            from: `"Senda de Logros" <${process.env.GMAIL_USER}>`,
            to: payload.userEmail,
            subject: emailContent.subject,
            html: emailContent.html,
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Email send error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to send email' },
            { status: 500 }
        );
    }
}
