# TrueFeedback

TrueFeedback is an advanced, AI-driven anonymous feedback platform built to facilitate honest, constructive communication. It leverages modern web technologies and powerful AI tools to provide context-aware feedback, intelligent coaching, and a seamless user experience.

## 🚀 Features

- **Anonymous Messaging**: Securely send and receive anonymous feedback.
- **AI-Powered Coaching Agent**: Get personalized insights and suggestions based on your historical feedback using our LangChain-integrated AI.
- **Context-Aware Suggestions**: Dynamically generate message suggestions tailored to specific user contexts.
- **Modern Chat Interface**: A professional, custom-built chat UI styled with Tailwind CSS, supporting real-time interactions and AI streaming.
- **Secure Authentication**: Robust user authentication and session management powered by NextAuth.js.
- **Responsive Design**: Fully responsive, accessible, and beautiful UI built with Radix UI and Tailwind CSS.
- **Email Notifications**: Integrated with Resend and React Email for reliable email notifications.

## 🛠️ Tech Stack

- **Framework**: [Next.js](https://nextjs.org/) (App Router/Pages)
- **Language**: TypeScript
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **UI Components**: [Radix UI](https://www.radix-ui.com/), [shadcn/ui](https://ui.shadcn.com/)
- **AI Integration**: [LangChain](https://js.langchain.com/), [OpenAI](https://openai.com/)
- **Database**: [MongoDB](https://www.mongodb.com/) (via Mongoose)
- **Authentication**: [NextAuth.js](https://next-auth.js.org/)
- **Validation**: [Zod](https://zod.dev/)
- **Email**: [Resend](https://resend.com/), [React Email](https://react.email/)

## ⚙️ Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn/pnpm
- MongoDB connection string
- OpenAI API Key
- Resend API Key

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/yourusername/TrueFeedback.git
   cd TrueFeedback
   ```

2. **Install dependencies:**
   ```bash
   npm install
   # or yarn install / pnpm install
   ```

3. **Set up environment variables:**
   Create a `.env` or `.env.local` file in the root directory and add the following variables:
   ```env
   MONGODB_URI=your_mongodb_connection_string
   NEXTAUTH_SECRET=your_nextauth_secret
   NEXTAUTH_URL=http://localhost:3000
   OPENAI_API_KEY=your_openai_api_key
   RESEND_API_KEY=your_resend_api_key
   ```

4. **Run the development server:**
   ```bash
   npm run dev
   # or yarn dev / pnpm dev
   ```

5. **Open the app:**
   Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## 🧠 AI Engineering Highlights

TrueFeedback demonstrates advanced AI engineering capabilities:
- **Streaming Responses**: Uses LangChain's streaming capabilities for a fluid and performant AI chat experience.
- **Model Agnosticism**: LangChain integration ensures the application can easily swap or upgrade underlying LLM providers.
- **Prompt Engineering**: Carefully crafted system prompts ensure the AI Coaching Agent provides constructive, actionable, and safe advice based on user feedback data.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📝 License

This project is licensed under the MIT License.
