#![no_std]
use soroban_sdk::{
    contract, contractimpl, contracttype, contracterror,
    Address, Env, String, Vec
};

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum Error {
    EmptyMessage = 1,
    MessageNotFound = 2,
}

#[contracttype]
#[derive(Clone)]
pub struct Message {
    pub author: Address,
    pub text: String,
    pub ledger: u32,
}

#[contracttype]
pub enum DataKey {
    Messages,
}

#[contract]
pub struct GuestbookContract;

#[contractimpl]
impl GuestbookContract {
    pub fn write_message(
        env: Env,
        author: Address,
        text: String,
    ) -> Result<u32, Error> {
        author.require_auth();
        if text.is_empty() {
            return Err(Error::EmptyMessage);
        }

        let mut messages: Vec<Message> = env
            .storage()
            .instance()
            .get(&DataKey::Messages)
            .unwrap_or(Vec::new(&env));

        messages.push_back(Message {
            author,
            text,
            ledger: env.ledger().sequence(),
        });

        env.storage().instance().set(&DataKey::Messages, &messages);
        Ok(messages.len() - 1)
    }

    pub fn get_message(env: Env, id: u32) -> Result<Message, Error> {
        let messages: Vec<Message> = env
            .storage()
            .instance()
            .get(&DataKey::Messages)
            .unwrap_or(Vec::new(&env));

        messages.get(id).ok_or(Error::MessageNotFound)
    }

    pub fn total_messages(env: Env) -> u32 {
        let messages: Vec<Message> = env
            .storage()
            .instance()
            .get(&DataKey::Messages)
            .unwrap_or(Vec::new(&env));

        messages.len()
    }
}

mod test;