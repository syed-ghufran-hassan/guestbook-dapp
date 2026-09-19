#![cfg(test)]

use super::*;
use soroban_sdk::testutils::Address as _;
use soroban_sdk::{Address, Env, String};
use soroban_sdk::testutils::Ledger;

#[test]
fn test_write_and_read() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(GuestbookContract, ());
    let client = GuestbookContractClient::new(&env, &contract_id);

    let user = Address::generate(&env);

    assert_eq!(client.total_messages(), 0);

    let idx = client.write_message(&user, &String::from_str(&env, "Hello!"));
    assert_eq!(idx, 0);
    assert_eq!(client.total_messages(), 1);

    let msg = client.get_message(&0);
    assert_eq!(msg.text, String::from_str(&env, "Hello!"));
}

#[test]
#[should_panic]
fn test_empty_message_rejected() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(GuestbookContract, ());
    let client = GuestbookContractClient::new(&env, &contract_id);

    let user = Address::generate(&env);
    client.write_message(&user, &String::from_str(&env, ""));
}

#[test]
fn test_get_nonexistent_message() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(GuestbookContract, ());
    let client = GuestbookContractClient::new(&env, &contract_id);

    let result = client.try_get_message(&999);
    assert!(result.is_err());
}

#[test]
fn test_multiple_messages_ordered() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(GuestbookContract, ());
    let client = GuestbookContractClient::new(&env, &contract_id);

    let user = Address::generate(&env);

    client.write_message(&user, &String::from_str(&env, "first"));
    client.write_message(&user, &String::from_str(&env, "second"));
    client.write_message(&user, &String::from_str(&env, "third"));

    assert_eq!(client.total_messages(), 3);
    assert_eq!(client.get_message(&0).text, String::from_str(&env, "first"));
    assert_eq!(client.get_message(&1).text, String::from_str(&env, "second"));
    assert_eq!(client.get_message(&2).text, String::from_str(&env, "third"));
}

#[test]
fn test_ledger_recorded() {
    let env = Env::default();
    env.mock_all_auths();
    env.ledger().set_sequence_number(42);

    let contract_id = env.register(GuestbookContract, ());
    let client = GuestbookContractClient::new(&env, &contract_id);

    let user = Address::generate(&env);
    client.write_message(&user, &String::from_str(&env, "test"));

    let msg = client.get_message(&0);
    assert_eq!(msg.ledger, 42);
}