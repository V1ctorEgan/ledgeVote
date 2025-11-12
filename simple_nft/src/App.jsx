import React, { useState, useEffect } from 'react';
import { Wallet, Image, Send, Trash2, Edit3, CheckCircle, AlertCircle } from 'lucide-react';
import {
  ConnectButton,
  useWallet,
} from "@suiet/wallet-kit";
import "@suiet/wallet-kit/style.css";
import { TransactionBlock } from '@mysten/sui.js/transactions';
import { SuiClient } from '@mysten/sui.js/client';

// Your deployed contract details
const PACKAGE_ID = "0xfbbf9e467f594d891cadefaf1f5e764b5f5e85b055bf295cf5bfab8decf7e140";
// MintCap is optional now - only needed for mint_nft_with_cap function
const MINT_CAP_ID = "0xdec300da3cbb52e89d7481de932fd3e274418812c456f25f63d445a2d8195adc";

// Initialize Sui client
const suiClient = new SuiClient({ url: 'https://fullnode.testnet.sui.io:443' });

function App() {
  const wallet = useWallet();
  const [nfts, setNfts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  
  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');

  // Load NFTs when wallet connects
  useEffect(() => {
    if (wallet.connected && wallet.account?.address) {
      loadNFTs(wallet.account.address);
    }
  }, [wallet.connected, wallet.account]);

  // Load user's NFTs
  const loadNFTs = async (accountAddress) => {
    try {
      setLoading(true);
      
      // Fetch all objects owned by the user
      const objects = await suiClient.getOwnedObjects({
        owner: accountAddress,
        options: {
          showType: true,
          showContent: true,
          showDisplay: true,
        },
      });

      // Filter for SimpleNFT objects
      const nftObjects = objects.data.filter(obj => 
        obj.data?.type?.includes('::simple_nft::SimpleNFT')
      );

      // Parse NFT data
      const parsedNFTs = nftObjects.map(obj => {
        const fields = obj.data?.content?.fields || {};
        return {
          id: obj.data.objectId,
          name: fields.name || 'Unknown',
          description: fields.description || 'No description',
          imageUrl: fields.image_url || 'https://via.placeholder.com/400',
          creator: fields.creator || 'Unknown',
        };
      });

      setNfts(parsedNFTs);
    } catch (error) {
      console.error('Load NFTs error:', error);
      setMessage({ type: 'error', text: 'Failed to load NFTs from blockchain' });
    } finally {
      setLoading(false);
    }
  };

  // Mint NFT
  const mintNFT = async () => {
    if (!wallet.connected) {
      setMessage({ type: 'error', text: 'Please connect wallet first!' });
      return;
    }

    if (!name || !description || !imageUrl) {
      setMessage({ type: 'error', text: 'Please fill all fields!' });
      return;
    }

    try {
      setLoading(true);
      setMessage({ type: 'info', text: 'Minting NFT... Please approve in wallet' });

      const tx = new TransactionBlock();
      
      // Using the public mint_nft function (no MintCap needed!)
      tx.moveCall({
        target: `${PACKAGE_ID}::simple_nft::mint_nft`,
        arguments: [
          tx.pure(name),
          tx.pure(description),
          tx.pure(imageUrl),
          tx.pure(wallet.account.address),
        ],
      });

      const result = await wallet.signAndExecuteTransactionBlock({
        transactionBlock: tx,
        options: {
          showEffects: true,
        },
      });
      
      setMessage({ 
        type: 'success', 
        text: `NFT Minted! TX: ${result.digest}` 
      });
      
      // Clear form
      setName('');
      setDescription('');
      setImageUrl('');
      
      // Reload NFTs
      await loadNFTs(wallet.account.address);
    } catch (error) {
      console.error('Mint error:', error);
      setMessage({ type: 'error', text: `Failed to mint: ${error.message}` });
    } finally {
      setLoading(false);
    }
  };

  // Transfer NFT
  const transferNFT = async (nftId) => {
    const recipient = prompt('Enter recipient address:');
    if (!recipient) return;

    try {
      setLoading(true);
      setMessage({ type: 'info', text: 'Transferring NFT...' });

      const tx = new TransactionBlock();
      
      tx.moveCall({
        target: `${PACKAGE_ID}::simple_nft::transfer_nft`,
        arguments: [
          tx.object(nftId),
          tx.pure(recipient),
        ],
      });

      const result = await wallet.signAndExecuteTransactionBlock({
        transactionBlock: tx,
        options: {
          showEffects: true,
        },
      });
      
      setMessage({ 
        type: 'success', 
        text: `NFT Transferred! TX: ${result.digest}` 
      });
      
      await loadNFTs(wallet.account.address);
    } catch (error) {
      console.error('Transfer error:', error);
      setMessage({ type: 'error', text: `Failed to transfer: ${error.message}` });
    } finally {
      setLoading(false);
    }
  };

  // Update Description
  const updateDescription = async (nftId) => {
    const newDesc = prompt('Enter new description:');
    if (!newDesc) return;

    try {
      setLoading(true);
      setMessage({ type: 'info', text: 'Updating description...' });

      const tx = new TransactionBlock();
      
      tx.moveCall({
        target: `${PACKAGE_ID}::simple_nft::update_description`,
        arguments: [
          tx.object(nftId),
          tx.pure(newDesc),
        ],
      });

      const result = await wallet.signAndExecuteTransactionBlock({
        transactionBlock: tx,
        options: {
          showEffects: true,
        },
      });
      
      setMessage({ 
        type: 'success', 
        text: `Description Updated! TX: ${result.digest}` 
      });
      
      await loadNFTs(wallet.account.address);
    } catch (error) {
      console.error('Update error:', error);
      setMessage({ type: 'error', text: `Failed to update: ${error.message}` });
    } finally {
      setLoading(false);
    }
  };

  // Burn NFT
  const burnNFT = async (nftId) => {
    if (!window.confirm('Are you sure you want to burn this NFT? This cannot be undone!')) return;

    try {
      setLoading(true);
      setMessage({ type: 'info', text: 'Burning NFT...' });

      const tx = new TransactionBlock();
      
      tx.moveCall({
        target: `${PACKAGE_ID}::simple_nft::burn_nft`,
        arguments: [
          tx.object(nftId),
        ],
      });

      const result = await wallet.signAndExecuteTransactionBlock({
        transactionBlock: tx,
        options: {
          showEffects: true,
        },
      });
      
      setMessage({ 
        type: 'success', 
        text: `NFT Burned! TX: ${result.digest}` 
      });
      
      await loadNFTs(wallet.account.address);
    } catch (error) {
      console.error('Burn error:', error);
      setMessage({ type: 'error', text: `Failed to burn: ${error.message}` });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-purple-900 via-blue-900 to-indigo-900 text-white">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-4 bg-linear-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            Simple NFT Minter
          </h1>
          <p className="text-gray-300 text-lg">Create and manage your NFTs on Sui</p>
        </div>

        {/* Message Alert */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${
            message.type === 'success' ? 'bg-green-500/20 border border-green-500/50' :
            message.type === 'error' ? 'bg-red-500/20 border border-red-500/50' :
            'bg-blue-500/20 border border-blue-500/50'
          }`}>
            {message.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            <span className="text-sm">{message.text}</span>
            <button onClick={() => setMessage(null)} className="ml-auto text-xl">&times;</button>
          </div>
        )}

        {/* Connect Wallet Button */}
        {!wallet.connected ? (
          <div className="text-center mb-12">
            <ConnectButton className="mx-auto" />
            <p className="text-gray-400 mt-4 text-sm">
              Wallet status: <span className="text-purple-400">{wallet.status}</span>
            </p>
            <p className="text-gray-400 text-sm">
              Make sure you have Sui Wallet extension installed
            </p>
          </div>
        ) : (
          <>
            {/* Connected Account Info */}
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 mb-8 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-linear-to-r from-purple-400 to-pink-400 rounded-full" />
                <div>
                  <p className="text-sm text-gray-400">Connected Wallet</p>
                  <p className="font-mono text-sm">
                    {wallet.account.address.slice(0, 6)}...{wallet.account.address.slice(-4)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => wallet.disconnect()}
                className="text-sm text-gray-400 hover:text-white transition-colors"
              >
                Disconnect
              </button>
            </div>

            {/* Mint Form */}
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 mb-8 border border-white/20">
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                <Image className="w-6 h-6" />
                Mint New NFT
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">NFT Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="My Awesome NFT"
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-purple-500 transition-colors text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Description</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="A unique NFT on Sui blockchain..."
                    rows={3}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-purple-500 transition-colors resize-none text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Image URL</label>
                  <input
                    type="text"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="https://example.com/image.png"
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-purple-500 transition-colors text-white"
                  />
                </div>

                <button
                  onClick={mintNFT}
                  disabled={loading || !name || !description || !imageUrl}
                  className="w-full bg-linear-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:from-gray-500 disabled:to-gray-600 text-white px-6 py-4 rounded-lg font-semibold transition-all transform hover:scale-105 disabled:scale-100 disabled:cursor-not-allowed"
                >
                  {loading ? 'Minting...' : 'Mint NFT'}
                </button>
              </div>
            </div>

            {/* NFT Gallery */}
            <div>
              <h2 className="text-2xl font-bold mb-6">Your NFTs</h2>
              
              {loading && nfts.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent mx-auto mb-4" />
                  Loading NFTs...
                </div>
              ) : nfts.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <Image className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p>No NFTs yet. Mint your first one above!</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {nfts.map((nft) => (
                    <div key={nft.id} className="bg-white/10 backdrop-blur-sm rounded-xl overflow-hidden border border-white/20 hover:border-purple-500/50 transition-all transform hover:scale-105">
                      <div className="aspect-square bg-linear-to-br from-purple-500/20 to-pink-500/20 relative">
                        <img 
                          src={nft.imageUrl} 
                          alt={nft.name}
                          className="w-full h-full object-cover"
                          onError={(e) => e.target.style.display = 'none'}
                        />
                      </div>
                      
                      <div className="p-4">
                        <h3 className="font-bold text-lg mb-2">{nft.name}</h3>
                        <p className="text-sm text-gray-400 mb-4 line-clamp-2">{nft.description}</p>
                        
                        <div className="flex gap-2">
                          <button
                            onClick={() => transferNFT(nft.id)}
                            className="flex-1 bg-blue-500/20 hover:bg-blue-500/30 p-2 rounded-lg transition-colors flex items-center justify-center gap-2"
                            title="Transfer"
                          >
                            <Send className="w-4 h-4" />
                          </button>
                          
                          <button
                            onClick={() => updateDescription(nft.id)}
                            className="flex-1 bg-purple-500/20 hover:bg-purple-500/30 p-2 rounded-lg transition-colors flex items-center justify-center gap-2"
                            title="Update"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          
                          <button
                            onClick={() => burnNFT(nft.id)}
                            className="flex-1 bg-red-500/20 hover:bg-red-500/30 p-2 rounded-lg transition-colors flex items-center justify-center gap-2"
                            title="Burn"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        
                        <p className="text-xs text-gray-500 mt-3 font-mono truncate">
                          ID: {nft.id.slice(0, 8)}...{nft.id.slice(-6)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* Footer */}
        <div className="mt-12 text-center text-gray-400 text-sm">
          <p className="mb-2">Contract: {PACKAGE_ID.slice(0, 8)}...{PACKAGE_ID.slice(-6)}</p>
          <p>Built on Sui • Testnet</p>
        </div>
      </div>
    </div>
  );
}

export default App;