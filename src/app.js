    class App {
        constructor() {
            this.ContractAddress = "0x9106c933ee8a7b9eCfE3ED770776f25B92940ffc";
            this.AbiLocation = "./market.json";
            this.ContractABI = null;
            this.signer = null;
            this.contract = null;
            this.walletConnected = false;
            this.userAddress = null;
        }

        async loadABI() {
            try {
                const response = await fetch(this.AbiLocation);
                const data = await response.json();
                this.ContractABI = data.abi || data;
                console.log("ABI loaded successfully.", this.ContractABI);
            } catch (error) {
                console.error("Failed to load ABI:", error);
            }
        }

        async connectMetaMaskAndContract() {
            try {
                if (!window.ethereum) {
                    alert("MetaMask not detected. Please install it.");
                    return;
                }

                if (!this.ContractABI) {
                    await this.loadABI();
                }

                const provider = new ethers.providers.Web3Provider(window.ethereum);
                await provider.send("eth_requestAccounts", []);
                this.signer = provider.getSigner();

                this.contract = new ethers.Contract(
                    this.ContractAddress,
                    this.ContractABI,
                    this.signer
                );

                this.walletConnected = true;
                this.userAddress = await this.signer.getAddress();

                // Hide the overlay so user can interact with page now
                document.getElementById("overlay").style.display = "none";

                console.log("Connected to MetaMask and contract successfully.");
                console.log("User Address:", this.userAddress);

                await this.listAvailableProducts();

            } catch (error) {
                console.error("MetaMask connection failed:", error);
            }
        }

        // ----------------------------------------------------------------

        async registerUser() {
            const code = document.getElementById("registrationCode").value;
            try {
                const register = await this.contract.registerWithCode(code);
                await register.wait();
                toastr.success("Successfully registered! You can now list your products for sale");
            } catch (error) {
                toastr.error("REGISTRATION FAILED");
                console.error("FAILED TO REGISTER:", error);
            }
        }

        async sellProduct() {
            const name = document.getElementById("productName").value;
            const price = document.getElementById("productPrice").value;
            try {
                const sale = await this.contract.sellProduct(name, price);
                await sale.wait();
                toastr.success("Product successfully listed for sale");
                this.listAvailableProducts();
            } catch (error){
                toastr.error("FAILED TO LIST PRODUCT FOR SALE");
                console.error("FAILED TO SELL:", error);
            }
        }

        async buyProduct(id, price) {
            try {
                // We must pass the price in the 'value' field for payable functions
                const tx = await this.contract.buyProduct(id, {
                    value: price
                });

                toastr.info("Transaction sent... waiting for confirmation.");
                await tx.wait();

                toastr.success("Purchase successfully completed!");
                this.listAvailableProducts(); // Refresh the list
            } catch (error) {
                toastr.error("FAILED PURCHASE");
                console.error("FAILED TO BUY:", error);
            }
        }

        async confirmDelivery() {
            const id = document.getElementById("productID").value;
            try {
                const confirm = await this.contract.confirmDelivery(id);
                await confirm.wait();
                toastr.success("Successful confirmation of delivery");
            } catch (error) {
                toastr.error("FAILED TO CONFIRM DELIVERY");
                console.error("FAILED TO CONFIRM:", error);
            }
        }

        async listAvailableProducts() {
            const container = document.getElementById("list-container");
            if (!container) return;
            container.innerHTML = "";

            try {
                // Fetch the count (Requires 'uint public productCount' in Solidity)
                const total = await this.contract.productCount();
                const count = total.toNumber();

                console.log("Found products:", count);

                for (let i = 0; i < count; i++) {
                    // Fetch each product from the public mapping
                    const product = await this.contract.productsMap(i);

                    if (!product.sold) {
                        const col = document.createElement('div');
                        col.className = "col-md-4 mb-4";
                        col.innerHTML = `
                            <div class="card h-100 shadow-sm">
                                <div class="card-body text-center">
                                    <h5 class="card-title">${product.name}</h5>
                                    <p class="text-muted">ID: ${product.id.toString()}</p>
                                    <p class="font-weight-bold">${product.price.toString()} Wei</p>
                                    <button class="btn btn-primary btn-block" 
                                            onclick="window.myApp.buyProduct('${product.id.toString()}', '${product.price.toString()}')">
                                        BUY
                                    </button>
                                </div>
                            </div>
                        `;
                        container.appendChild(col);
                    }
                }
            } catch (error) {
                console.error("DISPLAY ERROR:", error);
            }
        }
    }

    document.addEventListener("DOMContentLoaded", async () => {
        window.myApp = new App();
        await window.myApp.connectMetaMaskAndContract();

        document.getElementById("register").addEventListener("click", () => {
            myApp.registerUser();
        });
        document.getElementById("sell-product").addEventListener("click", () => {
            myApp.sellProduct();
        });
        document.getElementById("confirm-delivery").addEventListener("click", () => {
            myApp.confirmDelivery();
        });
    });
