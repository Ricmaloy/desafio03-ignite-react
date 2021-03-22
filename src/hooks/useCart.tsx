import { access } from 'node:fs';
import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('RocketShoes:cart');
    
    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      
      const newProductAmount = cart.reduce((acc, product) => {
        if(product.id === productId) {
          acc += product.amount
        }

        return acc;
      }, 1);

      const productInStock:Stock = await api.get(`stock/${productId}`).then(response => response.data);

      const isProductAmountRequestNotAvaliable = newProductAmount > productInStock.amount;

      if( isProductAmountRequestNotAvaliable ) {
        toast.error('Quantidade solicitada fora de estoque');
      } else {
        const requestedProduct:Product = await api.get(`products/${productId}`).then(response => response.data);

        if(newProductAmount === 1) {

          setCart([...cart,{...requestedProduct, amount: 1}])
          localStorage.setItem('@RocketShoes:cart', JSON.stringify([...cart,{...requestedProduct, amount: 1}]));
        } else {
          const newCart = cart.map((product) => {
            if(product.id === productId) {
              return {
                ...product,
                amount: product.amount+1
              }
            }
            return product;
          });

          setCart(newCart);
          localStorage.setItem('@RocketShoes:cart', JSON.stringify([...newCart]));
        }
      }

    } catch(error) {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      let productExist = false;
      
      const newCart = cart.filter(product => {
        if (product.id === productId){
          productExist = true;
        }
        return product.id !== productId
      });

      if(productExist) {
        setCart(newCart);
        localStorage.setItem('@RocketShoes:cart', JSON.stringify([...newCart]));
      } else {
        throw new Error();
      }
      
    } catch(error) {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {

      if(amount <= 0) {
        return;
      }

      const productInStock: Stock = await api.get(`stock/${productId}`).then(response => response.data);

      if(amount > productInStock.amount) {
        toast.error('Quantidade solicitada fora de estoque');
      } else {
        const newCart = cart.map((product) => {
          if(product.id === productId) {
            return {
              ...product,
              amount: amount,
            }
          }
          return product;
        });

        setCart(newCart);
        localStorage.setItem('@RocketShoes:cart', JSON.stringify([...newCart]));
      }
    } catch(error) {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
