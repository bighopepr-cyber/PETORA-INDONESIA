export function formatCurrency(amount: number): string {
  if (!Number.isSafeInteger(amount)) {
    throw new RangeError(
      "Jumlah rupiah harus berupa bilangan bulat yang aman.",
    );
  }

  return new Intl.NumberFormat("id-ID", {
    currency: "IDR",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(amount);
}

export function formatDate(value: Date | string, timeZone: string): string {
  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new RangeError("Tanggal tidak valid.");
  }

  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "long",
    timeZone,
  }).format(date);
}
