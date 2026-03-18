# Reddit Scraper API

![Next JS](https://img.shields.io/badge/Next-black?style=for-the-badge&logo=next.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white)
![Vercel](https://img.shields.io/badge/vercel-%23000000.svg?style=for-the-badge&logo=vercel&logoColor=white)

## Overview

Reddit Scraper API is a resilient data extraction utility and web interface designed to reliably parse and structure Reddit threads. 

Historically, extracting structured JSON from Reddit cloud environments (like Vercel or AWS) results in automatic 403 Forbidden blocks. This architecture solves that by routing requests through a dynamically rotating residential proxy infrastructure (ScraperAPI). It bypasses strict rate limits and data-center IP bans to deliver clean, highly readable text data.

This tool is specifically engineered for data researchers and machine learning pipelines, featuring automated Personally Identifiable Information (PII) anonymization and deleted content recovery.

## Live Demo

A publicly accessible demonstration of the tool is available for quick testing:

**Live URL:** https://reddit-scraper-lovat.vercel.app/

The demo includes a UI where users can input a Reddit URL and test the scraping flow without any local setup.

> **Important Limitations:**
>
> * The live deployment is **for demonstration purposes only**.
> * API routes and backend proxy functionality **will not work** in this version.
> * Features such as ScraperAPI routing and X-Ray recovery are **only functional in the self-hosted environment** with a valid API key.

For full functionality, including proxy routing and archive recovery, you must run the project locally or deploy it with your own environment configuration.


## Core Architecture & Features

* **Residential Proxy Routing:** Bypasses hostile data-center firewalls and rate limits by masking the Next.js API requests through authentic residential IP nodes.
* **Automated Identity Anonymization:** Recursively parses deeply nested comment trees and dynamically replaces raw usernames (e.g., replacing author tags with structured "Person 1", "Person 2" mapping) to ensure safe downstream data handling.
* **X-Ray Recovery Mode:** Integrates with historical archive databases (Pullpush) to cross-reference and reconstruct `[deleted]` comments and missing original post (OP) text.
* **Developer-First UI:** Includes a responsive, dark-mode web interface heavily inspired by modern developer tools, featuring an interactive sandbox to test API payloads.
* **Fault Tolerance:** Implements automated, exponential backoff and triple-retry logic to handle proxy timeouts seamlessly.

## Deployment Notes

Due to Reddit's aggressive anti-bot measures and cloud IP blocking:

* Serverless deployments (e.g., Vercel, AWS Lambda) without proxy routing will consistently result in `403 Forbidden` responses.
* This project is intentionally architected to **require a residential proxy layer** for reliable data extraction.
* The included UI can still be deployed independently, but scraping functionality depends on proper backend configuration.

For production use:

* Always configure `SCRAPER_API_KEY`
* Avoid exposing API routes without proxy protection
* Consider rate limiting and logging for stability at scale

## Environment Setup

To run this project locally, you must provide your own residential proxy API key. 

1. Create a `.env.local` file in the root directory.
2. Add your ScraperAPI key as follows:

```env
SCRAPER_API_KEY=your_secure_scraperapi_key_here
```

> **Security Note:** Ensure your `.env.local` file is included in your `.gitignore` so your private keys are not committed to version control. If deploying to Vercel, add this key directly in your project's Environment Variables dashboard.

## Quick Start Development

Clone the repository and install the necessary dependencies:

```bash
# Clone the repository
git clone [https://github.com/YOUR_USERNAME/reddit-scraper-api.git](https://github.com/YOUR_USERNAME/reddit-scraper-api.git)

# Navigate into the directory
cd reddit-scraper-api

# Install dependencies
npm install

# Start the local development server
npm run dev
```

Navigate to `http://localhost:3000` to view the web interface and API documentation.

## Usage Workflow

1. Launch the development server.
2. Open the web interface at `http://localhost:3000`.
3. Paste a valid Reddit thread URL into the input field.
4. (Optional) Enable **X-Ray Mode** for deleted content recovery.
5. Execute the request and inspect the structured output.

The interface acts as a sandbox for testing API behavior before integrating it into external systems or pipelines.


## API Reference

The core extraction engine is exposed via a single RESTful endpoint.

### Endpoint: `POST /api/v1/scrape`

**Headers:**
* `Content-Type: application/json`

**Request Body Parameters:**

| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `url` | `string` | Yes | The target Reddit submission URL to be parsed. |
| `xRayMode` | `boolean` | No | Enables archive cross-referencing to recover deleted content. Defaults to `false`. |

### Example cURL Request

```bash
curl -X POST [https://your-deployment-url.com/api/v1/scrape](https://your-deployment-url.com/api/v1/scrape) \
  -H "Content-Type: application/json" \
  -d '{
    "url": "[https://www.reddit.com/r/technology/comments/](https://www.reddit.com/r/technology/comments/)...",
    "xRayMode": true
  }'
```

### JSON Response Schema

The API successfully intercepts the proxy payload and returns the structured, anonymized thread.

```json
{
  "status": "success",
  "title": "Sample Reddit Thread Title",
  "content": "TITLE: Sample Reddit Thread Title\n Person 1 (OP):\n The original post text here...\n ↳ Person 2: The first comment...\n    ↳ Person 1: The OP replying to the comment..."
}
```
## Disclaimer

This tool is intended for research, educational, and data processing purposes.

Users are responsible for:

* Complying with Reddit's Terms of Service
* Respecting data privacy and ethical scraping practices
* Ensuring extracted data is used in accordance with applicable laws and platform policies

The anonymization layer is designed to reduce exposure of personally identifiable information, but it does not guarantee full compliance in all jurisdictions.