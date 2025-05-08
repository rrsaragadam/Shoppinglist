import { ShoppingListModel } from './model';
import { useState, useEffect, useCallback } from 'preact/hooks';
import './app.css';

interface AppProps {
  model: ShoppingListModel;
}

interface PriceData {
  [key: string]: number | null;
}

export function App({ model }: AppProps) {
  const [itemName, setItemName] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [category, setCategory] = useState('Other');
  const [isCategoryDisabled, setIsCategoryDisabled] = useState(false);
  const [isEditingCategories, setIsEditingCategories] = useState(false);
  const [isShowingExpenses, setIsShowingExpenses] = useState(false);
  const [prevShowingExpenses, setPrevShowingExpenses] = useState(false);
  const [prices, setPrices] = useState<PriceData>({});
  const [loadingPrices, setLoadingPrices] = useState<Set<string>>(new Set());

  // Load items when component mounts
  useEffect(() => {
    model.loadItems();
  }, []);

  // Fetch price for a single item
  const fetchPrice = useCallback(async (itemName: string) => {
    try {
      setLoadingPrices(prev => new Set([...prev, itemName]));
      const response = await fetch(`https://student.cs.uwaterloo.ca/~cs349/resources/prices.php?item=${itemName}`);
      const data = await response.json();
      setPrices(prev => ({ ...prev, [itemName]: data.price }));
    } catch (error) {
      console.error(`Error fetching price for ${itemName}:`, error);
      setPrices(prev => ({ ...prev, [itemName]: null }));
    } finally {
      setLoadingPrices(prev => {
        const newSet = new Set(prev);
        newSet.delete(itemName);
        return newSet;
      });
    }
  }, []);

  // Fetch prices for all items when expenses overlay is opened
  useEffect(() => {
    // Only fetch when transitioning from closed to open
    if (isShowingExpenses && !prevShowingExpenses) {
      const boughtItems = model.items.value.filter(item => item.bought);
      boughtItems.forEach(item => {
        fetchPrice(item.name);
      });
    }
    setPrevShowingExpenses(isShowingExpenses);
  }, [isShowingExpenses, prevShowingExpenses, model.items.value, fetchPrice]);

  const handleShowExpenses = () => {
    setPrices({}); // Reset prices before showing overlay
    setIsShowingExpenses(true);
  };

  const handleCloseExpenses = () => {
    setIsShowingExpenses(false);
  };

  // Calculate total cost for an item
  const calculateItemCost = (itemName: string, quantity: number): string => {
    const price = prices[itemName];
    if (price === null) return 'Error';
    if (price === undefined || loadingPrices.has(itemName)) return '...';
    return (price * quantity).toFixed(2);
  };

  // Calculate total cost of all items
  const calculateTotalCost = (items: Array<{ name: string; quantity: number }>): string => {
    const total = items.reduce((sum, item) => {
      const price = prices[item.name];
      if (typeof price === 'number') {
        return sum + (price * item.quantity);
      }
      return sum;
    }, 0);
    
    const anyLoading = items.some(item => loadingPrices.has(item.name));
    const anyError = items.some(item => prices[item.name] === null);
    
    if (anyError) return 'Error';
    if (anyLoading) return '...';
    return `$${total.toFixed(2)}`;
  };

  const handleNameKeyPress = (e: KeyboardEvent) => {
    // Prevent space as first character
    if (e.key === ' ' && (itemName === '' || (e.target as HTMLInputElement).selectionStart === 0)) {
      e.preventDefault();
      return;
    }
    // Only allow letters and special keys
    if (!/^[a-zA-Z]$/.test(e.key) && e.key !== 'Backspace' && e.key !== 'Delete' && 
        e.key !== 'ArrowLeft' && e.key !== 'ArrowRight' && e.key !== 'Tab' && 
        e.key !== 'Enter' && e.key !== ' ') {
      e.preventDefault();
    }
  };

  const handleNameChange = (e: Event) => {
    const input = e.target as HTMLInputElement;
    const value = input.value.replace(/^\s+/, ''); // Remove leading whitespace
    // Only allow letters and spaces, no leading whitespace
    if (value === '' || /^[A-Za-z][A-Za-z\s]*$/.test(value)) {
      setItemName(value);
    }
  };

  const handleQuantityChange = (e: Event) => {
    const input = e.target as HTMLInputElement;
    // Only allow numeric digits
    if (!/^\d*$/.test(input.value)) {
      input.value = input.value.replace(/[^\d]/g, '');
      return;
    }
    const value = parseInt(input.value);
    if (!isNaN(value)) {
      if (value > 24) {
        setQuantity(24);
        input.value = '24';
      } else if (value < 1) {
        setQuantity(1);
        input.value = '1';
      } else {
        setQuantity(value);
      }
    }
  };

  const handleQuantityKeyPress = (e: KeyboardEvent) => {
    // Only allow numeric keys [0-9] and special keys like backspace, delete, arrows
    if (!/[0-9]/.test(e.key) && e.key !== 'Backspace' && e.key !== 'Delete' && 
        e.key !== 'ArrowLeft' && e.key !== 'ArrowRight' && e.key !== 'Tab' && e.key !== 'Enter') {
      e.preventDefault();
    }
  };

  const handleKeyPress = (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddItem();
    }
  };

  const handleAddItem = () => {
    if (!itemName.trim()) return;

    const existingItem = model.items.value.find(item => item.name === itemName);
    
    if (existingItem) {
      // Update quantity of existing item
      const newQuantity = Math.min(existingItem.quantity + quantity, 24);
      model.updateQuantity(itemName, newQuantity);
      // Set category to match existing item and disable selector
      setCategory(existingItem.category);
      setIsCategoryDisabled(true);
    } else {
      // Add new item
      model.addItem({
        name: itemName,
        quantity: quantity,
        category: category,
        bought: false
      });
    }

    // Reset form
    setItemName('');
    setQuantity(1);
    setCategory('Other');
    setIsCategoryDisabled(false);
  };

  // Auto-select category when item name matches existing item
  useEffect(() => {
    if (itemName.trim()) {
      const existingItem = model.items.value.find(item => item.name === itemName);
      if (existingItem) {
        setCategory(existingItem.category);
        setIsCategoryDisabled(true);
      } else {
        setIsCategoryDisabled(false);
      }
    }
  }, [itemName, model.items.value]);

  const handleEditCategories = () => {
    setIsEditingCategories(true);
  };

  const handleCloseEdit = () => {
    setIsEditingCategories(false);
  };

  const handleCategoryChange = (itemName: string, newCategory: string) => {
    // Update all instances of the item with the new category
    model.items.value = model.items.value.map(item => 
      item.name === itemName ? { ...item, category: newCategory } : item
    );
  };

  // Get unique items sorted alphabetically
  const uniqueItems = Array.from(new Set(model.items.value.map(item => item.name)))
    .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));

  return (
    <div class="shopping-list-container">
      {/* Settings Section */}
      <section class="settings-section">
        <div class="settings-buttons">
          <button class="settings-button" onClick={handleEditCategories}>✍🏻 Edit Categories</button>
          <button class="settings-button" onClick={handleShowExpenses}>💵 Show Expenses</button>
        </div>
      </section>

      {/* Add Section */}
      <section class="add-section">
        <div class="add-form">
          <input
            type="text"
            class="item-name-input"
            placeholder="Item Name"
            value={itemName}
            onInput={handleNameChange}
            onKeyPress={(e) => {
              handleNameKeyPress(e);
              handleKeyPress(e);
            }}
          />
          <input
            type="number"
            class="quantity-input"
            min="1"
            max="24"
            step="1"
            value={quantity}
            onInput={handleQuantityChange}
            onKeyPress={(e) => {
              handleQuantityKeyPress(e);
              handleKeyPress(e);
            }}
          />
          <select 
            class="category-select"
            value={category}
            onChange={(e) => setCategory((e.target as HTMLSelectElement).value)}
            disabled={isCategoryDisabled}
          >
            {model.categories.value.map(cat => (
              <option key={cat.name} value={cat.name}>{cat.icon}</option>
            ))}
          </select>
          <button class="add-button" onClick={handleAddItem}>➕</button>
        </div>
      </section>

      {/* List Section */}
      <section class="list-section">
        {model.isLoading.value ? (
          <div class="loading-container">
            <div class="loading-spinner"></div>
            <p>Loading items...</p>
          </div>
        ) : (
          model.categories.value.map(cat => {
            const items = model.getItemsByCategory(cat.name);
            if (items.length === 0) return null;
            
            const boughtCount = items.filter(item => item.bought).length;
            const sortedItems = [...items].sort((a, b) => a.name.localeCompare(b.name));
            
            return (
              <div key={cat.name} class="category-group" style={{ backgroundColor: cat.colour }}>
                <h3>
                  {cat.icon} {cat.name} ({boughtCount}/{items.length})
                </h3>
                <ul class="items-list">
                  {sortedItems.map(item => (
                    <li key={item.name} class="shopping-item">
                      <input
                        type="checkbox"
                        class="item-checkbox"
                        checked={item.bought}
                        onChange={() => model.toggleBought(item.name)}
                      />
                      <span class="item-name" style={{ textDecoration: item.bought ? 'line-through' : 'none' }}>
                        {item.name}
                      </span>
                      {!item.bought && (
                        <input
                          type="number"
                          class="item-quantity"
                          min="1"
                          max="24"
                          step="1"
                          value={item.quantity}
                          onKeyPress={handleQuantityKeyPress}
                          onChange={(e) => {
                            const value = parseInt((e.target as HTMLInputElement).value);
                            if (!isNaN(value)) {
                              if (value > 24) {
                                model.updateQuantity(item.name, 24);
                                (e.target as HTMLInputElement).value = '24';
                              } else if (value < 1) {
                                model.updateQuantity(item.name, 1);
                                (e.target as HTMLInputElement).value = '1';
                              } else {
                                model.updateQuantity(item.name, value);
                              }
                            }
                          }}
                        />
                      )}
                      <button 
                        class="remove-button"
                        onClick={() => {
                          model.items.value = model.items.value.filter(i => i.name !== item.name);
                        }}
                      >
                        ❌
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })
        )}
      </section>

      {/* Status Section */}
      <section class="status-section">
        <div class="total-items-container">
          <div class="total-items-content">
            <span class="total-items-label">Total Items:</span>
            <div class="total-items-number">
              {model.items.value.reduce((sum, item) => sum + item.quantity, 0)}
            </div>
            <span class="total-items-suffix">✨</span>
          </div>
        </div>
      </section>

      {/* Edit Categories Overlay */}
      {isEditingCategories && (
        <div class="overlay">
          <div class="overlay-content">
            <button class="close-button" onClick={handleCloseEdit}>×</button>
            <div class="items-grid">
              {uniqueItems.map(itemName => {
                const item = model.items.value.find(i => i.name === itemName);
                return (
                  <div key={itemName} class="grid-item">
                    <a href="#" class="grid-item-name" onClick={(e) => e.preventDefault()}>{itemName}</a>
                    <select 
                      class="grid-category-select"
                      value={item?.category || 'Other'}
                      onChange={(e) => handleCategoryChange(itemName, (e.target as HTMLSelectElement).value)}
                    >
                      {model.categories.value.map(cat => (
                        <option key={cat.name} value={cat.name}>
                          {cat.icon} {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Expenses Overlay */}
      {isShowingExpenses && (
        <div class="overlay">
          <div class="overlay-content">
            <button class="close-button" onClick={handleCloseExpenses}>🗙</button>
            <div class="expenses-content">
              <table class="expenses-table">
                <thead>
                  <tr>
                    <th>Item Name</th>
                    <th>Quantity</th>
                    <th>Price per Item</th>
                    <th>Item Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {model.items.value
                    .filter(item => item.bought)
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map(item => (
                      <tr key={item.name}>
                        <td>{item.name}</td>
                        <td>{item.quantity}</td>
                        <td>
                          {loadingPrices.has(item.name) ? (
                            <span class="loading-price"></span>
                          ) : prices[item.name] === null ? (
                            <span class="error-price">Error</span>
                          ) : prices[item.name] ? (
                            `$${prices[item.name]?.toFixed(2)}`
                          ) : '-'}
                        </td>
                        <td>
                          {loadingPrices.has(item.name) ? (
                            <span class="loading-price"></span>
                          ) : prices[item.name] === null ? (
                            <span class="error-price">Error</span>
                          ) : prices[item.name] ? (
                            `$${calculateItemCost(item.name, item.quantity)}`
                          ) : '-'}
                        </td>
                      </tr>
                    ))
                  }
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={3} style="text-align: right"><strong>Total:</strong></td>
                    <td>
                      {calculateTotalCost(model.items.value.filter(item => item.bought))}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
