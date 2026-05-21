/**
 * Minimal type stub for react-native-purchases (RevenueCat).
 * The actual native module is loaded lazily with require() in paywall.tsx.
 * Full types: https://github.com/RevenueCat/react-native-purchases
 */
declare module 'react-native-purchases' {
  export interface PurchasesPackage {
    identifier: string;
    product: {
      priceString: string;
      title: string;
      description: string;
    };
  }

  export interface PurchasesOfferings {
    current: {
      availablePackages: PurchasesPackage[];
    } | null;
  }

  export interface CustomerInfo {
    entitlements: {
      active: Record<string, { isActive: boolean }>;
    };
  }

  const Purchases: {
    configure(options: { apiKey: string }): void;
    getOfferings(): Promise<PurchasesOfferings>;
    purchasePackage(pkg: PurchasesPackage): Promise<{ customerInfo: CustomerInfo }>;
    restorePurchases(): Promise<CustomerInfo>;
    getCustomerInfo(): Promise<CustomerInfo>;
  };

  export default Purchases;
}
