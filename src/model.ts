import { signal } from '@preact/signals';

export interface Category {
  icon: string;
  name: string;
  colour: string;
}

export interface ShoppingItem {
  name: string;
  quantity: number;
  category: string;
  bought: boolean;
}

export const categories = signal<Category[]>([
  { icon: '🥛', name: "Dairy", colour: `hsl(220, 75%, 75%)` },
  { icon: '🧊', name: "Frozen", colour: `hsl(220, 90%, 95%)` },
  { icon: '🍌', name: "Fruit", colour: `hsl(140, 75%, 75%)` },
  { icon: '🛒', name: "Other", colour: `hsl(0, 0%, 90%)` }
]);

export const items = signal<ShoppingItem[]>([]);
export const isLoading = signal(true);

export class ShoppingListModel {
  items = items;
  categories = categories;
  isLoading = isLoading;

  async loadItems() {
    try {
      const response = await fetch('https://student.cs.uwaterloo.ca/~cs349/resources/items.php');
      const data = await response.json();
      this.items.value = data;
    } catch (error) {
      console.error('Error loading items:', error);
      // Keep existing items if fetch fails
    } finally {
      this.isLoading.value = false;
    }
  }

  addItem(item: ShoppingItem) {
    this.items.value = [...this.items.value, item];
  }

  toggleBought(itemName: string) {
    this.items.value = this.items.value.map(item => 
      item.name === itemName ? { ...item, bought: !item.bought } : item
    );
  }

  updateQuantity(itemName: string, quantity: number) {
    this.items.value = this.items.value.map(item =>
      item.name === itemName ? { ...item, quantity } : item
    );
  }

  getItemsByCategory(category: string) {
    return this.items.value.filter(item => item.category === category);
  }

  getUnboughtItems() {
    return this.items.value.filter(item => !item.bought);
  }

  getBoughtItems() {
    return this.items.value.filter(item => item.bought);
  }

  updateItemCategory(itemName: string, newCategory: string) {
    this.items.value = this.items.value.map(item =>
      item.name === itemName ? { ...item, category: newCategory } : item
    );
  }
} 