// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract market {

    address public admin;
    bytes32 registrationCodeHash;

    struct Product {
        uint id;
        string name;
        uint price;
        address payable seller;
        address buyer;
        bool sold;
        bool delivered;
    }

    mapping(uint => Product) public productsMap;
    mapping(address => bool) public registeredUsersMap;
    uint public productCount;


    // // ONLY ADMIN modifier rule
    // modifier onlyAdmin() {
    //     require(msg.sender == admin, "ADMIN ACCESS REQUIRED, You are not an admin");
    //     _;
    // }
    // ONLY REGISTERED USERS modifier rule
    modifier onlyRegisteredUsers() {
        require(registeredUsersMap[msg.sender], "REGISTERED USERS ONLY, You are not a registered user and will need to register with access code to use this");
        _;
    }

    // Creator of SC = admin & sets registration code to register users (Task 1 + 3)
    constructor(string memory registrationCode) {
        admin = msg.sender;
        registrationCodeHash = keccak256(abi.encodePacked(registrationCode));
    }

    // Users can register themselves using the registration code (Task 4)
    function registerWithCode(string memory userCode) public {
        if (registeredUsersMap[msg.sender] == false) {
            require(keccak256(abi.encodePacked(userCode)) == registrationCodeHash, "Incorrect Code");
            registeredUsersMap[msg.sender] = true;
        }
    }

     // CONFIRM DELIVERY and TRANSFER FUNDS TO SELLER (Task 8)
    function confirmDelivery(uint productId) public {
        Product storage product = productsMap[productId];
        require(msg.sender == product.buyer, "ONLY THE BUYER CAN CONFIRM RECEIPT");
        require(product.sold == true, "Product has not been sold yet");
        require(product.delivered == false, "Product has already been delivered");
        product.delivered = true;
        product.seller.transfer(product.price); // Transfer funds to the seller
    }

    // LIST ALL AVAILABLE PRODUCTS (products that have not been sold yet) (Task 9)
    function listAvailableProducts() public view returns (Product[] memory) {
        uint availableProductsCount = 0;
        for (uint i = 0; i < productCount; i++) {
            if (!productsMap[i].sold) {
                availableProductsCount++;
            }
        }
        Product[] memory availableProducts = new Product[](availableProductsCount);
        uint availableProductIndex = 0;
        for (uint i = 0; i < productCount; i++) {
            if (!productsMap[i].sold) {
                availableProducts[availableProductIndex] = productsMap[i];
                availableProductIndex++;
            }
        }
        return availableProducts;
    }

    // ONLY REGISTERED USERS CAN: -------------------------------------
    // SELL PRODUCTS (Task 5)
    function sellProduct(string memory name, uint price) public onlyRegisteredUsers {
        productsMap[productCount] = Product(productCount, name, price, payable(msg.sender), address(0), false, false);
        productCount++;
    }

    // BUY PRODUCTS but funds are stored on the SC until the buyer receieves the package (Task 6)
    function buyProduct(uint productId) public payable {
        Product storage product = productsMap[productId];
        require(product.seller != address(0), "Product does not exist");
        require(product.sold == false, "Product has already been sold");
        require(msg.value == product.price, "Incorrect price sent");
        product.sold = true;
        product.buyer = payable(msg.sender);
    }
}
