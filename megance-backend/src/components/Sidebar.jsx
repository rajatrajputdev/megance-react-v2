import React from 'react';
import { Link } from 'react-router-dom';

const Sidebar = () => {
  return (
    <aside className="sidebar">
      <h2>Admin</h2>
      <ul>
        <li><Link to="/">Dashboard</Link></li>
        <li><Link to="/categories">Categories</Link></li>
        <li><Link to="/products">Products</Link></li>
        <li><Link to="/stock">Stock</Link></li>
        <li><Link to="/orders">Orders</Link></li>
        <li><Link to="/add-product">Add Product</Link></li>
      </ul>
    </aside>
  );
}; 

export default Sidebar;
