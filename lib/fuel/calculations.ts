export type FuelCalculationInput = {
  pricePerLiter: number;
  totalLiters: number;
  realPayment: number;
  totalDistance: number;
};

export type FuelCalculation = {
  estimatedAmount: number;
  paymentDifference: number;
  fuelEfficiency: number | null;
  costPerKm: number | null;
};

const roundMoney = (value: number) => Math.round(value * 100) / 100;
const roundRatio = (value: number) => Math.round(value * 100) / 100;

export function calculateFuel(input: FuelCalculationInput): FuelCalculation {
  const estimatedAmount = roundMoney(input.pricePerLiter * input.totalLiters);
  return {
    estimatedAmount,
    paymentDifference: roundMoney(estimatedAmount - input.realPayment),
    fuelEfficiency:
      input.totalLiters > 0 ? roundRatio(input.totalDistance / input.totalLiters) : null,
    costPerKm:
      input.totalDistance > 0 ? roundMoney(input.realPayment / input.totalDistance) : null,
  };
}
