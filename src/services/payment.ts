import type { PaymentMethod } from "@/types";

export interface PaymentRequest {
  amount: number;
  email: string;
  reference: string;
  method: PaymentMethod;
}

export interface PaymentProvider {
  name: "cash" | "paystack" | "flutterwave" | "stripe" | "transfer";
  initialize(request: PaymentRequest): Promise<{ reference: string; status: "pending" | "success" }>;
}

export const paymentProviders: Record<string, PaymentProvider> = {
  cash: {
    name: "cash",
    async initialize(request) {
      return { reference: request.reference, status: "pending" };
    },
  },
  transfer: {
    name: "transfer",
    async initialize(request) {
      return { reference: request.reference, status: "pending" };
    },
  },
  paystack: {
    name: "paystack",
    async initialize(request) {
      console.info("Paystack ready", request);
      return { reference: request.reference, status: "pending" };
    },
  },
  flutterwave: {
    name: "flutterwave",
    async initialize(request) {
      console.info("Flutterwave ready", request);
      return { reference: request.reference, status: "pending" };
    },
  },
  stripe: {
    name: "stripe",
    async initialize(request) {
      console.info("Stripe ready", request);
      return { reference: request.reference, status: "pending" };
    },
  },
};
