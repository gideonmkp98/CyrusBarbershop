#!/usr/bin/env node
// Standalone script to send a test booking confirmation email with mock data.
// Usage:
//   npm run test:email              # asks for recipient interactively
//   npm run test:email -- --to=you@example.com
//   npm run test:email -- --to=you@example.com --service="The Works" --date=2026-08-10 --time=14:30

import 'dotenv/config';
import readline from 'node:readline';
import { sendBookingConfirmation, sendBookingNotification, isMailConfigured } from '../src/lib/server/mail';
import { getBookingNotifyEmail } from '../src/lib/server/mail/env';
import { BUSINESS_CONTACT } from '../src/lib/server/mail/config';

interface CliArgs {
	to?: string;
	service?: string;
	barber?: string;
	date?: string;
	time?: string;
	duration?: number;
	price?: number;
	notes?: string;
	notify?: boolean;
}

function parseArgs(): CliArgs {
	const args = process.argv.slice(2);
	const result: CliArgs = {};

	for (const arg of args) {
		if (arg.startsWith('--to=')) {
			result.to = arg.slice(5);
		} else if (arg.startsWith('--service=')) {
			result.service = arg.slice(10);
		} else if (arg.startsWith('--barber=')) {
			result.barber = arg.slice(9);
		} else if (arg.startsWith('--date=')) {
			result.date = arg.slice(7);
		} else if (arg.startsWith('--time=')) {
			result.time = arg.slice(7);
		} else if (arg.startsWith('--duration=')) {
			result.duration = Number(arg.slice(11));
		} else if (arg.startsWith('--price=')) {
			result.price = Number(arg.slice(8));
		} else if (arg.startsWith('--notes=')) {
			result.notes = arg.slice(8);
		} else if (arg === '--notify' || arg === '--owner') {
			result.notify = true;
		} else if (arg === '--help' || arg === '-h') {
			showHelp();
			process.exit(0);
		}
	}

	return result;
}

function showHelp(): void {
	console.log(`
Send a test booking confirmation email using mock data.

Usage:
  npm run test:email
  npm run test:email -- --to=you@example.com
  npm run test:email -- --to=you@example.com --service="De Klassieke" --date=2026-08-10 --time=14:30

Options:
  --to=EMAIL          Recipient address (default: OWNER_EMAIL env var, otherwise prompts)
  --service=NAME      Service name (default: "The Works")
  --barber=NAME       Barber name (default: "Cyrus")
  --date=YYYY-MM-DD   Appointment date (default: 7 days from today)
  --time=HH:MM        Appointment time (default: 14:30)
  --duration=MINUTES  Service duration (default: 90)
  --price=EUR         Service price (default: 75)
  --notes=TEXT        Optional notes (default: mock note)
  --notify            Also send an owner (new-appointment) notification
  --help, -h          Show this help text
`);
}

function prompt(question: string): Promise<string> {
	const rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout
	});

	return new Promise((resolve) => {
		rl.question(question, (answer) => {
			rl.close();
			resolve(answer.trim());
		});
	});
}

function formatDateInput(date: Date): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
}

async function main(): Promise<void> {
	const args = parseArgs();
	let to = args.to || process.env.OWNER_EMAIL;

	if (!to) {
		to = await prompt('Enter recipient email address: ');
	}

	if (!to || !to.includes('@')) {
		console.error('❌ A valid recipient email address is required.');
		console.error('   Pass --to=EMAIL or set OWNER_EMAIL in your .env file.');
		process.exit(1);
	}

	if (!(isMailConfigured())) {
		console.error('❌ SMTP is not configured.');
		console.error('   Required environment variables:');
		console.error('     SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, MAIL_FROM');
		process.exit(1);
	}

	const siteUrl = process.env.PUBLIC_SITE_URL || 'https://cyrusbarbershop.nl';
	const defaultDate = new Date();
	defaultDate.setDate(defaultDate.getDate() + 7);

	const mockData = {
		to,
		clientName: 'Jan Jansen',
		serviceName: args.service || 'The Works',
		barberName: args.barber || 'Cyrus',
		date: args.date || formatDateInput(defaultDate),
		time: args.time || '14:30',
		duration: Number.isFinite(args.duration) ? args.duration! : 90,
		price: Number.isFinite(args.price) ? args.price! : 75,
		notes: args.notes ?? 'Eerste bezoek; graag extra aandacht voor de baard.',
		siteUrl,
		appointmentId: 999999
	};

	console.log('');
	console.log('Sending test booking confirmation email...');
	console.log(`  To:      ${to}`);
	console.log(`  From:    ${BUSINESS_CONTACT.email}`);
	console.log(`  Service: ${mockData.serviceName}`);
	console.log(`  Barber:  ${mockData.barberName}`);
	console.log(`  Date:    ${mockData.date}`);
	console.log(`  Time:    ${mockData.time}`);
	console.log('');

	const result = await sendBookingConfirmation(mockData);

	if (result.ok) {
		console.log('✅ Test email sent successfully.');
		console.log(`   Check the inbox of ${to} (and spam folder, just in case).`);
	} else {
		console.error(`❌ Failed to send test email: ${result.reason}`);
		process.exit(1);
	}

	if (args.notify) {
		const ownerEmail = getBookingNotifyEmail();
		if (!ownerEmail) {
			console.error('❌ --notify requested, but no BOOKING_NOTIFY_EMAIL/CONTACT_NOTIFY_EMAIL/OWNER_EMAIL is set.');
			process.exit(1);
		}

		console.log('');
		console.log('Sending test owner (new-appointment) notification...');
		console.log(`  To:      ${ownerEmail}`);
		console.log(`  Reply-To: jan.jansen@example.com`);
		console.log('');

		const notifyResult = await sendBookingNotification({
			clientName: mockData.clientName,
			clientEmail: 'jan.jansen@example.com',
			clientPhone: '+31 6 1234 5678',
			serviceName: mockData.serviceName,
			barberName: mockData.barberName,
			date: mockData.date,
			time: mockData.time,
			duration: mockData.duration,
			price: mockData.price,
			notes: mockData.notes,
			siteUrl: mockData.siteUrl,
			appointmentId: mockData.appointmentId
		});

		if (notifyResult.ok) {
			console.log('✅ Owner notification sent successfully.');
			console.log(`   Check the inbox of ${ownerEmail} (and spam folder, just in case).`);
		} else {
			console.error(`❌ Failed to send owner notification: ${notifyResult.reason}`);
			process.exit(1);
		}
	}
}

main().catch((error) => {
	console.error('Unexpected error while sending test email:', error);
	process.exit(1);
});
