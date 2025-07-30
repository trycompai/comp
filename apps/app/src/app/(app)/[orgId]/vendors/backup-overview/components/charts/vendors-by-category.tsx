import { Card, CardContent, CardHeader, CardTitle } from '@comp/ui/card';
import { db, VendorCategory } from '@db';
import { VendorCategoryChart } from './category-chart';

const VENDOR_CATEGORIES = Object.values(VendorCategory);

const CHART_COLORS = [
  'bg-chart-positive',
  'bg-chart-neutral',
  'bg-chart-warning',
  'bg-chart-destructive',
  'bg-chart-other',
];

interface Props {
  organizationId: string;
}

export async function VendorsByCategory({ organizationId }: Props) {
  const vendors = await getVendorsByCategory(organizationId);

  const data = VENDOR_CATEGORIES.map((category, index) => {
    const found = vendors.find(
      (vendor) => (vendor.category || 'other').toLowerCase() === category.toLowerCase(),
    );

    const formattedName =
      category === 'other'
        ? 'Other'
        : category
            .split('_')
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');

    return {
      name: formattedName,
      value: found ? found._count : 0,
      color: CHART_COLORS[index % CHART_COLORS.length],
    };
  }).sort((a, b) => b.value - a.value);

  // Separate categories with values > 0 and categories with values = 0
  const categoriesWithValues = data.filter((cat) => cat.value > 0);
  const categoriesWithoutValues = data.filter((cat) => cat.value === 0);

  // Determine which categories to show
  let categoriesToShow = [...categoriesWithValues];

  // If we have fewer than 4 categories with values, show up to 2 categories with no values
  if (categoriesWithValues.length < 4 && categoriesWithoutValues.length > 0) {
    categoriesToShow = [...categoriesWithValues, ...categoriesWithoutValues.slice(0, 2)];
  }

  return (
    <Card className="h-full w-full">
      <CardHeader>
        <CardTitle>{'Vendors by Category'}</CardTitle>
      </CardHeader>
      <CardContent className="w-full">
        <VendorCategoryChart data={categoriesToShow} showEmptyDepartments={true} />
      </CardContent>
    </Card>
  );
}

const getVendorsByCategory = async (organizationId: string) => {
  const vendorsByCategory = await db.vendor.groupBy({
    by: ['category'],
    where: { organizationId },
    _count: true,
  });

  return vendorsByCategory;
};
